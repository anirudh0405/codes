import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { handleGroqExplanationRequest } from './src/server/groqGateway';

function groqServerMiddleware(env: Record<string, string>): Plugin {
  const handler = (req: any, res: any) => {
    return handleGroqExplanationRequest(req, res, {
      apiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
      model: env.GROQ_MODEL || process.env.GROQ_MODEL,
      baseUrl: env.GROQ_BASE_URL || process.env.GROQ_BASE_URL,
      mockMode: env.GROQ_MOCK_MODE === 'true' || process.env.GROQ_MOCK_MODE === 'true',
    });
  };

  return {
    name: 'groq-server-middleware',
    configureServer(server) {
      server.middlewares.use('/api/groq/explain', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/groq/explain', handler);
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
