import { handleGroqExplanationRequest } from '../../src/server/groqGateway';

/**
 * Vercel Serverless Function: /api/groq/explain
 * Wraps the shared secure Groq gateway handler.
 */
export default async function handler(req: any, res: any) {
  return handleGroqExplanationRequest(req, res);
}
