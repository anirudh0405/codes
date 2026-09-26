import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

function groqServerMiddleware(env: Record<string, string>): Plugin {
  return {
    name: 'groq-server-middleware',
    configureServer(server) {
      server.middlewares.use('/api/groq/explain', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let rawBody = '';
        req.on('data', (chunk) => {
          rawBody += chunk;
        });

        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');

          const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
          const model = env.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
          const baseUrl = env.GROQ_BASE_URL || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

          if (!apiKey || apiKey.trim() === '') {
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: false,
              fallback: true,
              message: 'GROQ_API_KEY is not configured on the server.',
            }));
            return;
          }

          try {
            const payload = JSON.parse(rawBody || '{}');
            const { type, scoreData, parameterData } = payload;

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

              userPrompt = `Risk Score: ${scoreData?.riskScore} / 100\nRisk Category: ${scoreData?.riskBand}\nTop Contributors: ${(scoreData?.topContributors || []).join(', ')}`;
            } else if (type === 'parameter_impacts') {
              systemPrompt = `You are a clinical cardiovascular report assistant. For each provided parameter, write exactly ONE short, plain-language explanation (10-18 words) of why it contributes to cardiovascular risk.
Example:
LDL Cholesterol: "LDL is associated with plaque buildup in the arteries when levels are elevated."
Rules:
- Keep each explanation short and direct.
- Use only the provided parameter values.
- Do NOT invent diagnoses or values.
- Return ONLY a valid JSON object mapping each exact parameter name to its explanation string.`;

              userPrompt = `Parameters:\n${JSON.stringify(parameterData?.parameters || [], null, 2)}`;
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Invalid explanation type' }));
              return;
            }

            const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
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
            });

            if (!response.ok) {
              const errBody = await response.text();
              console.warn('Groq server API call returned status:', response.status, errBody);
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: false,
                fallback: true,
                message: 'Groq API request returned non-200 status',
              }));
              return;
            }

            const json = await response.json();
            const content = json.choices?.[0]?.message?.content?.trim();

            if (type === 'score_meaning') {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, text: content }));
            } else {
              try {
                const cleaned = content
                  .replace(/^```json\s*/i, '')
                  .replace(/^```\s*/, '')
                  .replace(/\s*```$/, '')
                  .trim();
                const parsed = JSON.parse(cleaned);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, parameterExplanations: parsed }));
              } catch {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: false, fallback: true }));
              }
            }
          } catch (err) {
            console.error('Groq server middleware caught error:', err);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: false, fallback: true }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      groqServerMiddleware(env),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
