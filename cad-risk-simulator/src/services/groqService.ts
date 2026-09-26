/**
 * Groq Explanation Service
 * ========================
 * Client-side interface to the server-side Groq language layer.
 * Calls /api/groq/explain to fetch concise clinical explanations for:
 * 1. "What does this score mean?" (2-3 concise sentences)
 * 2. "Why did the AI predict this?" (concise parameter explanations)
 *
 * CRITICAL SAFETY RULES:
 * - NEVER contains or exposes GROQ_API_KEY.
 * - Always falls back to static verified text on error, missing key, or timeout.
 * - Never shows raw API errors to the user.
 * - Does not invent diagnoses, scores, or probabilities.
 */

export interface ScoreExplanationInput {
  riskScore: number;
  riskBand: string;
  topContributors: string[];
}

export interface ParameterExplanationInput {
  parameters: Array<{
    parameter: string;
    impact: string;
    value: string | number;
    units?: string;
  }>;
}

export async function fetchScoreMeaningExplanation(
  input: ScoreExplanationInput,
  fallbackText: string
): Promise<string> {
  try {
    const res = await fetch('/api/groq/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'score_meaning',
        scoreData: input,
      }),
    });

    if (!res.ok) return fallbackText;
    const data = await res.json();
    if (data.success && data.text && typeof data.text === 'string') {
      return data.text.trim();
    }
    return fallbackText;
  } catch (err) {
    console.warn('Groq score explanation fetch failed, using clinical fallback:', err);
    return fallbackText;
  }
}

export async function fetchParameterExplanations(
  input: ParameterExplanationInput,
  fallbackMap: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/groq/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parameter_impacts',
        parameterData: input,
      }),
    });

    if (!res.ok) return fallbackMap;
    const data = await res.json();
    if (data.success && data.parameterExplanations && typeof data.parameterExplanations === 'object') {
      return { ...fallbackMap, ...data.parameterExplanations };
    }
    return fallbackMap;
  } catch (err) {
    console.warn('Groq parameter explanations fetch failed, using clinical fallback:', err);
    return fallbackMap;
  }
}
