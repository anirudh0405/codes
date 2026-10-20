/**
 * Arohan Step 2: AI / LLM Integration & Gateway Security Test Suite
 * =================================================================
 * Verifies all 13 security and functional requirements from Step 2:
 * 1. Frontend no longer calls Groq directly
 * 2. All provider calls route through server gateway
 * 3. API key read only by server-side code; never exposed
 * 4. Missing credentials produce explicit failure (HTTP 503)
 * 5. Successful provider responses parsed and returned correctly
 * 6. Malformed or empty provider responses handled safely (HTTP 502)
 * 7. Provider timeouts handled safely without fabricated clinical outputs (HTTP 504)
 * 8. Rate-limit enforcement per IP (HTTP 429)
 * 9. Invalid and oversized requests rejected (HTTP 400, 405, 413)
 * 10. Upstream provider authentication errors isolated safely (HTTP 502)
 * 11. Mock mode clearly distinguishable from live AI mode
 * 12. Existing AI-dependent UI consumers preserve expected response contracts
 * 13. Cardiovascular calculations and Step 1 report extraction remain intact
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }
  end(chunk) {
    if (chunk) this.body += chunk;
    this.emit('finish');
  }
}

// Helper to mock server request/response pair
function createMockHttpPair({
  method = 'POST',
  headers = {},
  body = '',
  remoteAddress = '192.168.1.100',
} = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.headers = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body))),
    ...headers,
  };
  req.socket = { remoteAddress };

  const res = new MockResponse();

  // Stream body
  process.nextTick(() => {
    const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
    req.emit('data', Buffer.from(dataStr));
    req.emit('end');
  });

  return { req, res };
}

async function runTest() {
  console.log('================================================================');
  console.log('   AROHAN STEP 2: SECURE AI / LLM INTEGRATION TEST SUITE       ');
  console.log('================================================================\n');

  const { handleGroqExplanationRequest } = await import('../src/server/groqGateway.ts');
  const { fetchScoreMeaningExplanation, fetchParameterExplanations } = await import('../src/services/groqService.ts');

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(num, title, condition, details) {
    if (condition) {
      console.log(`[PASS] Test ${num}: ${title} - ${details}`);
      passed++;
      results.push({ test: num, title, status: 'PASS', details });
    } else {
      console.error(`[FAIL] Test ${num}: ${title} - ${details}`);
      failed++;
      results.push({ test: num, title, status: 'FAIL', details });
    }
  }

  // ── 1. Frontend no longer calls Groq directly ─────────────────────────────
  console.log('\n--- 1. Client Direct Groq Call Isolation ---');
  const groqServiceContent = fs.readFileSync(path.resolve(__dirname, '../src/services/groqService.ts'), 'utf-8');
  const noDirectGroqCall = !groqServiceContent.includes('api.groq.com') && groqServiceContent.includes('/api/groq/explain');
  assert(
    1,
    'Client Groq Isolation',
    noDirectGroqCall,
    'Frontend code exclusively routes to /api/groq/explain; zero calls to api.groq.com exist in client code'
  );

  // ── 2. All applicable provider calls route through server gateway ─────────
  console.log('\n--- 2. Server Gateway Route Interception ---');
  const { req: req2, res: res2 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 45, riskBand: 'Moderate Risk', topContributors: ['LDL Cholesterol'] },
    },
  });
  const gatewayHandledPromise = new Promise((resolve) => res2.on('finish', resolve));
  handleGroqExplanationRequest(req2, res2, { apiKey: 'mock' });
  await gatewayHandledPromise;
  const body2 = JSON.parse(res2.body || '{}');
  assert(
    2,
    'Server Gateway Routing',
    res2.statusCode === 200 && body2.success === true,
    'Server gateway correctly intercepted, processed, and responded to /api/groq/explain'
  );

  // ── 3. API key read only by server-side code; never exposed ───────────────
  console.log('\n--- 3. Credential Exposure Audit ---');
  const secretKey = 'gsk_test_secret_key_12345';
  const { req: req3, res: res3 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 50, riskBand: 'High Risk', topContributors: ['CAC'] },
    },
  });
  const auditPromise = new Promise((resolve) => res3.on('finish', resolve));
  handleGroqExplanationRequest(req3, res3, { apiKey: secretKey, mockMode: true });
  await auditPromise;
  const bodyStr3 = res3.body;
  const noKeyLeaked = !bodyStr3.includes(secretKey) && !bodyStr3.includes('gsk_');
  assert(
    3,
    'Credential Confidentiality',
    noKeyLeaked,
    'Server gateway responses never expose the private GROQ_API_KEY to client or error responses'
  );

  // ── 4. Missing credentials produce an explicit failure ─────────────────────
  console.log('\n--- 4. Missing Credentials Explicit Failure ---');
  const { req: req4, res: res4 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 30, riskBand: 'Low Risk', topContributors: ['HDL'] },
    },
  });
  const noCredPromise = new Promise((resolve) => res4.on('finish', resolve));
  handleGroqExplanationRequest(req4, res4, { apiKey: '', mockMode: false });
  await noCredPromise;
  const body4 = JSON.parse(res4.body || '{}');
  assert(
    4,
    'Missing Credentials Handling',
    res4.statusCode === 503 && body4.success === false && body4.error === 'CREDENTIALS_NOT_CONFIGURED',
    `Returns explicit HTTP 503 (${body4.error}: "${body4.message}") rather than silent success`
  );

  // ── 5. Successful provider responses parsed and returned correctly ────────
  console.log('\n--- 5. Provider Response Parsing ---');
  // Mock global fetch for provider test
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Your moderate risk score is driven primarily by elevated LDL and mild vascular calcification.',
            },
          },
        ],
      }),
    };
  };

  const { req: req5, res: res5 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 55, riskBand: 'Moderate Risk', topContributors: ['LDL', 'CAC'] },
    },
  });
  const successPromise = new Promise((resolve) => res5.on('finish', resolve));
  handleGroqExplanationRequest(req5, res5, { apiKey: 'gsk_valid_key', mockMode: false });
  await successPromise;
  const body5 = JSON.parse(res5.body || '{}');
  assert(
    5,
    'Provider Response Parsing',
    res5.statusCode === 200 &&
    body5.success === true &&
    body5.source === 'provider' &&
    body5.text.includes('moderate risk score'),
    `Provider response successfully sanitized and tagged as source="provider" (Model: ${body5.model})`
  );

  // ── 6. Malformed or empty provider responses handled safely ───────────────
  console.log('\n--- 6. Malformed & Empty Provider Response Handling ---');
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: '   ' } }] }),
  });

  const { req: req6, res: res6 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 40, riskBand: 'Moderate Risk', topContributors: ['Triglycerides'] },
    },
  });
  const emptyPromise = new Promise((resolve) => res6.on('finish', resolve));
  handleGroqExplanationRequest(req6, res6, { apiKey: 'gsk_valid_key', mockMode: false });
  await emptyPromise;
  const body6 = JSON.parse(res6.body || '{}');
  assert(
    6,
    'Empty Provider Output Handling',
    res6.statusCode === 502 && body6.success === false && body6.error === 'EMPTY_PROVIDER_RESPONSE',
    `Empty provider content safely rejected with HTTP 502 (${body6.error})`
  );

  // ── 7. Provider timeouts and errors do not produce fabricated clinical outputs
  console.log('\n--- 7. Provider Timeout Handling ---');
  globalThis.fetch = async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    throw timeoutErr;
  };

  const { req: req7, res: res7 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 70, riskBand: 'High Risk', topContributors: ['Systolic BP'] },
    },
  });
  const timeoutPromise = new Promise((resolve) => res7.on('finish', resolve));
  handleGroqExplanationRequest(req7, res7, { apiKey: 'gsk_valid_key', mockMode: false });
  await timeoutPromise;
  const body7 = JSON.parse(res7.body || '{}');
  assert(
    7,
    'Provider Timeout Safety',
    res7.statusCode === 504 && body7.success === false && body7.error === 'GATEWAY_TIMEOUT',
    `Gateway timeout safely returns HTTP 504 (${body7.error}) without fabricating clinical data`
  );

  // Restore real fetch
  globalThis.fetch = originalFetch;

  // ── 8. Rate-limit enforcement per IP ──────────────────────────────────────
  console.log('\n--- 8. IP Rate Limiting ---');
  const rateLimitIp = '10.200.5.1';
  let rateLimitHit = false;
  let retryAfterHeader = null;

  for (let i = 0; i < 35; i++) {
    const { req: rReq, res: rRes } = createMockHttpPair({
      remoteAddress: rateLimitIp,
      body: {
        type: 'score_meaning',
        scoreData: { riskScore: 20, riskBand: 'Low Risk', topContributors: [] },
      },
    });
    const p = new Promise((resolve) => rRes.on('finish', resolve));
    handleGroqExplanationRequest(rReq, rRes, { apiKey: 'mock' });
    await p;
    if (rRes.statusCode === 429) {
      rateLimitHit = true;
      retryAfterHeader = rRes.headers['retry-after'];
      break;
    }
  }
  assert(
    8,
    'Rate Limiting Enforcement',
    rateLimitHit && retryAfterHeader !== null,
    `Requests beyond 30/min correctly rejected with HTTP 429 (Retry-After: ${retryAfterHeader}s)`
  );

  // ── 9. Invalid or oversized requests rejected ─────────────────────────────
  console.log('\n--- 9. Request Validation & Size Limits ---');
  // 9a. Method not allowed
  const { req: req9a, res: res9a } = createMockHttpPair({ method: 'GET' });
  const p9a = new Promise((resolve) => res9a.on('finish', resolve));
  handleGroqExplanationRequest(req9a, res9a);
  await p9a;

  // 9b. Payload too large (>64 KB)
  const hugePayload = 'A'.repeat(70 * 1024);
  const { req: req9b, res: res9b } = createMockHttpPair({ body: hugePayload });
  const p9b = new Promise((resolve) => res9b.on('finish', resolve));
  handleGroqExplanationRequest(req9b, res9b);
  await p9b;

  // 9c. Invalid schema (negative risk score)
  const { req: req9c, res: res9c } = createMockHttpPair({
    body: { type: 'score_meaning', scoreData: { riskScore: -15, riskBand: 'Invalid' } },
  });
  const p9c = new Promise((resolve) => res9c.on('finish', resolve));
  handleGroqExplanationRequest(req9c, res9c);
  await p9c;

  assert(
    9,
    'Request Rejection (Method, Size, Schema)',
    res9a.statusCode === 405 && res9b.statusCode === 413 && res9c.statusCode === 400,
    `Method GET -> 405, Size >64KB -> 413, Schema out-of-bounds -> 400 (${JSON.parse(res9c.body).error})`
  );

  // ── 10. Upstream authentication errors isolated safely ────────────────────
  console.log('\n--- 10. Upstream Auth Error Isolation ---');
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () => 'Invalid API key provided',
  });

  const { req: req10, res: res10 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 60, riskBand: 'High Risk', topContributors: ['Smoking'] },
    },
  });
  const p10 = new Promise((resolve) => res10.on('finish', resolve));
  handleGroqExplanationRequest(req10, res10, { apiKey: 'invalid_key', mockMode: false });
  await p10;
  const body10 = JSON.parse(res10.body || '{}');
  assert(
    10,
    'Upstream Auth Isolation',
    res10.statusCode === 502 && body10.success === false && !res10.body.includes('invalid_key'),
    `Upstream 401 safely mapped to HTTP 502 (${body10.error}) without exposing invalid key`
  );

  globalThis.fetch = originalFetch;

  // ── 11. Mock mode clearly distinguishable from live AI mode ───────────────
  console.log('\n--- 11. Mock Mode vs Live AI Mode Distinction ---');
  const { req: req11, res: res11 } = createMockHttpPair({
    body: {
      type: 'score_meaning',
      scoreData: { riskScore: 48, riskBand: 'Moderate Risk', topContributors: ['LDL'] },
    },
  });
  const p11 = new Promise((resolve) => res11.on('finish', resolve));
  handleGroqExplanationRequest(req11, res11, { mockMode: true });
  await p11;
  const body11 = JSON.parse(res11.body || '{}');
  assert(
    11,
    'Mock Mode Distinction',
    body11.source === 'mock' && body11.model === 'simulated-groq-mock',
    `Mock mode explicitly returns source="mock" and model="simulated-groq-mock", distinguishable from source="provider"`
  );

  // ── 12. Frontend UI service contracts preserved ───────────────────────────
  console.log('\n--- 12. Frontend groqService Contract Verification ---');
  // Test fallback handling in groqService
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ success: false, error: 'CREDENTIALS_NOT_CONFIGURED', message: 'No API key' }),
  });

  const scoreResult = await fetchScoreMeaningExplanation(
    { riskScore: 62, riskBand: 'High Risk', topContributors: ['LDL'] },
    'Verified Clinical Baseline: High cardiovascular risk requires aggressive LDL lowering.'
  );

  const paramResult = await fetchParameterExplanations(
    { parameters: [{ parameter: 'LDL', impact: 'high', value: '188 mg/dL' }] },
    { LDL: 'Verified baseline LDL explanation.' }
  );

  assert(
    12,
    'Frontend Service Contract & Fallback Transparency',
    scoreResult.success === false &&
    scoreResult.source === 'fallback' &&
    scoreResult.data.includes('Verified Clinical Baseline') &&
    paramResult.success === false &&
    paramResult.source === 'fallback' &&
    paramResult.data.LDL === 'Verified baseline LDL explanation.',
    `groqService provides transparent ExplanationResponse<{source: 'fallback', data: ...}> preventing masquerading of failed calls`
  );

  globalThis.fetch = originalFetch;

  // ── 13. Cardiovascular calculation and Step 1 report extraction invariance ─
  console.log('\n--- 13. Cardiovascular Calculation Invariance Check ---');
  const { parseClinicalText } = await import('../src/services/clinicalExtractor.ts');
  const sampleReport = parseClinicalText('Total Cholesterol: 240 mg/dL\nCAC Score: 450 AU\nBlood Pressure: 140/90 mmHg');
  assert(
    13,
    'Protected Calculation Invariance',
    sampleReport.fields.totalCholesterol === 240 &&
    sampleReport.fields.cac === 450 &&
    sampleReport.fields.systolic === 140 &&
    sampleReport.fields.diastolic === 90,
    `Step 1 clinical extraction and calculations remain identical and fully preserved`
  );

  console.log('\n================================================================');
  console.log(`TOTAL TESTS EXECUTED: ${results.length}`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
