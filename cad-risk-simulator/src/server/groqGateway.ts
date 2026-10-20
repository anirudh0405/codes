/**
 * Arohan Secure AI / LLM Server-Side Gateway
 * ==========================================
 * Secure gateway for Groq language model inference.
 *
 * Security Controls:
 * 1. Read API credentials exclusively on the server from process.env / private env.
 * 2. Strict request payload size limits (max 64 KB, HTTP 413).
 * 3. In-memory IP rate limiting (sliding window, max 30 req/min, HTTP 429).
 * 4. Strict input schema validation for explanation payloads (HTTP 400).
 * 5. Safe provider timeout (10,000ms AbortSignal, HTTP 504).
 * 6. Safe upstream error and rate limit propagation without stack trace exposure (HTTP 502/429).
 * 7. Provider response validation and sanitization.
 * 8. Explicit distinction between 'provider' (live AI), 'mock' (simulation), and 'fallback'.
 * 9. Compatible with Vite connect middleware, Vercel serverless, and Node HTTP.
 */

export interface GatewayRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on: (event: string, callback: (...args: any[]) => void) => any;
  socket?: { remoteAddress?: string };
}

export interface GatewayResponse {
  statusCode: number;
  setHeader: (name: string, value: string) => any;
  end: (chunk?: any) => any;
}

export interface GatewayOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  mockMode?: boolean;
}

// ── In-Memory Rate Limiter (30 requests / 60 seconds per IP) ────────────────
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64 KB

// Periodically prune stale entries to prevent memory leaks
const pruneInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);
if (typeof pruneInterval === 'object' && pruneInterval !== null && 'unref' in pruneInterval) {
  (pruneInterval as any).unref();
}

function getClientIp(req: GatewayRequest): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function checkRateLimit(clientIp: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

// ── Schema Validators ───────────────────────────────────────────────────────
function validateScoreData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'scoreData must be an object' };
  }
  if (typeof data.riskScore !== 'number' || isNaN(data.riskScore) || data.riskScore < 0 || data.riskScore > 100) {
    return { valid: false, error: 'riskScore must be a number between 0 and 100' };
  }
  if (typeof data.riskBand !== 'string' || data.riskBand.trim().length === 0 || data.riskBand.length > 50) {
    return { valid: false, error: 'riskBand must be a non-empty string under 50 characters' };
  }
  if (!Array.isArray(data.topContributors) || data.topContributors.length > 10) {
    return { valid: false, error: 'topContributors must be an array of at most 10 items' };
  }
  for (const item of data.topContributors) {
    if (typeof item !== 'string' || item.length > 100) {
      return { valid: false, error: 'topContributors items must be strings under 100 characters' };
    }
  }
  return { valid: true };
}

function validateParameterData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'parameterData must be an object' };
  }
  if (!Array.isArray(data.parameters) || data.parameters.length === 0 || data.parameters.length > 20) {
    return { valid: false, error: 'parameters must be an array of 1 to 20 items' };
  }
  for (const p of data.parameters) {
    if (!p || typeof p !== 'object') {
      return { valid: false, error: 'Each parameter item must be an object' };
    }
    if (typeof p.parameter !== 'string' || p.parameter.trim().length === 0 || p.parameter.length > 100) {
      return { valid: false, error: 'parameter name must be a string under 100 characters' };
    }
    if (p.impact !== 'high' && p.impact !== 'moderate' && p.impact !== 'low') {
      return { valid: false, error: 'parameter impact must be "high", "moderate", or "low"' };
    }
    if (typeof p.value !== 'string' && typeof p.value !== 'number') {
      return { valid: false, error: 'parameter value must be a string or number' };
    }
  }
  return { valid: true };
}

// ── Main Gateway Request Handler ───────────────────────────────────────────
export async function handleGroqExplanationRequest(
  req: GatewayRequest,
  res: GatewayResponse,
  options?: GatewayOptions
): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  // 1. Method verification
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end(JSON.stringify({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are supported.',
    }));
    return;
  }

  // 2. Rate limiting check
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateLimit.retryAfter || 60));
    res.end(JSON.stringify({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Please retry in ${rateLimit.retryAfter || 60} seconds.`,
    }));
    return;
  }

  // 3. Request body accumulation with strict size limits
  const contentLength = parseInt(String(req.headers['content-length'] || '0'), 10);
  if (contentLength > MAX_PAYLOAD_SIZE) {
    res.statusCode = 413;
    res.end(JSON.stringify({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: `Payload exceeds maximum allowed size of ${MAX_PAYLOAD_SIZE / 1024} KB.`,
    }));
    return;
  }

  let rawBody = '';
  let payloadTooLarge = false;

  await new Promise<void>((resolve) => {
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > MAX_PAYLOAD_SIZE) {
        payloadTooLarge = true;
      }
    });
    req.on('end', () => resolve());
  });

  if (payloadTooLarge) {
    res.statusCode = 413;
    res.end(JSON.stringify({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: `Payload exceeds maximum allowed size of ${MAX_PAYLOAD_SIZE / 1024} KB.`,
    }));
    return;
  }

  // 4. JSON parsing & input validation
  let payload: any;
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    }));
    return;
  }

  const { type, scoreData, parameterData } = payload;
  if (type !== 'score_meaning' && type !== 'parameter_impacts') {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'INVALID_TYPE',
      message: 'Type must be "score_meaning" or "parameter_impacts".',
    }));
    return;
  }

  if (type === 'score_meaning') {
    const check = validateScoreData(scoreData);
    if (!check.valid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'VALIDATION_FAILED', message: check.error }));
      return;
    }
  } else {
    const check = validateParameterData(parameterData);
    if (!check.valid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'VALIDATION_FAILED', message: check.error }));
      return;
    }
  }

  // 5. Credential & environment resolution (Server-side ONLY)
  const procEnv = (globalThis as any).process?.env || {};

  const apiKey = (
    options?.apiKey ??
    procEnv.GROQ_API_KEY ??
    ''
  ).trim();

  const model = (
    options?.model ??
    procEnv.GROQ_MODEL ??
    'llama-3.3-70b-versatile'
  ).trim();

  const baseUrl = (
    options?.baseUrl ??
    procEnv.GROQ_BASE_URL ??
    'https://api.groq.com/openai/v1'
  ).replace(/\/+$/, '');

  const isMockMode = Boolean(
    options?.mockMode ||
    procEnv.GROQ_MOCK_MODE === 'true' ||
    apiKey === 'mock' ||
    payload.mock === true
  );

  // 6. Handle Mock Mode (explicitly marked, never confused with live AI)
  if (isMockMode) {
    if (type === 'score_meaning') {
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        source: 'mock',
        model: 'simulated-groq-mock',
        text: `Simulated Clinical Narrative: The calculated cardiovascular risk score of ${scoreData.riskScore} places the patient in the ${scoreData.riskBand} tier, influenced by key findings (${scoreData.topContributors.join(', ')}).`,
      }));
    } else {
      const mockMap: Record<string, string> = {};
      for (const p of parameterData.parameters) {
        mockMap[p.parameter] = `Simulated parameter impact: ${p.parameter} (${p.value}) contributes to overall cardiac vascular load.`;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        source: 'mock',
        model: 'simulated-groq-mock',
        parameterExplanations: mockMap,
      }));
    }
    return;
  }

  // 7. Check credentials for live provider call
  if (!apiKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      success: false,
      error: 'CREDENTIALS_NOT_CONFIGURED',
      message: 'GROQ_API_KEY is not configured on the server.',
    }));
    return;
  }

  // 8. Construct bounded clinical prompts
  let systemPrompt = '';
  let userPrompt = '';

  if (type === 'score_meaning') {
    systemPrompt = `You are a clinical cardiovascular report assistant. Provide exactly 2-3 concise sentences in simple language explaining what this cardiovascular risk score means for the patient.
Rules:
- 2 to 3 concise sentences only.
- Use only the provided data (score, band, top contributors).
- Explain in simple, clear language.
- Do NOT change the numerical score.
- Do NOT invent new diagnoses or give unsupported medical certainty.
- Remain concise and clinical.`;

    userPrompt = `Risk Score: ${scoreData.riskScore} / 100\nRisk Category: ${scoreData.riskBand}\nTop Contributors: ${scoreData.topContributors.join(', ')}`;
  } else {
    systemPrompt = `You are a clinical cardiovascular report assistant. For each provided parameter, write exactly ONE short, plain-language explanation (10-18 words) of why it contributes to cardiovascular risk.
Example:
LDL Cholesterol: "LDL is associated with plaque buildup in the arteries when levels are elevated."
Rules:
- Keep each explanation short and direct.
- Use only the provided parameter values.
- Do NOT invent diagnoses or values.
- Return ONLY a valid JSON object mapping each exact parameter name to its explanation string.`;

    userPrompt = `Parameters:\n${JSON.stringify(parameterData.parameters, null, 2)}`;
  }

  // 9. Execute request with strict timeout and error isolation
  try {
    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 350,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!providerResponse.ok) {
      if (providerResponse.status === 429) {
        res.statusCode = 429;
        res.end(JSON.stringify({
          success: false,
          error: 'PROVIDER_RATE_LIMIT',
          message: 'Upstream AI provider rate limit reached. Please retry in a few moments.',
        }));
        return;
      }
      res.statusCode = 502;
      res.end(JSON.stringify({
        success: false,
        error: 'PROVIDER_ERROR',
        message: 'Upstream AI provider returned an error.',
      }));
      return;
    }

    const providerJson = await providerResponse.json();
    const content = providerJson.choices?.[0]?.message?.content?.trim();

    if (!content) {
      res.statusCode = 502;
      res.end(JSON.stringify({
        success: false,
        error: 'EMPTY_PROVIDER_RESPONSE',
        message: 'AI provider returned an empty response.',
      }));
      return;
    }

    if (type === 'score_meaning') {
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        source: 'provider',
        model,
        text: content,
      }));
    } else {
      try {
        const cleaned = content
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Expected object mapping parameter names to explanation strings.');
        }

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          source: 'provider',
          model,
          parameterExplanations: parsed,
        }));
      } catch {
        res.statusCode = 502;
        res.end(JSON.stringify({
          success: false,
          error: 'MALFORMED_PROVIDER_RESPONSE',
          message: 'AI provider returned output that could not be parsed as valid parameter explanations.',
        }));
      }
    }
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      res.statusCode = 504;
      res.end(JSON.stringify({
        success: false,
        error: 'GATEWAY_TIMEOUT',
        message: 'Request to AI provider timed out after 10 seconds.',
      }));
      return;
    }

    res.statusCode = 502;
    res.end(JSON.stringify({
      success: false,
      error: 'GATEWAY_ERROR',
      message: 'Failed to communicate with AI gateway.',
    }));
  }
}
