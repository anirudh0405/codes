/**
 * Groq Explanation Service
 * ========================
 * Client-side interface to the server-side Groq language layer.
 * Calls /api/groq/explain to fetch concise clinical explanations for:
 * 1. "What does this score mean?" (2-3 concise sentences)
 * 2. "Why did the AI predict this?" (concise parameter explanations)
 *
 * CRITICAL SAFETY & SECURITY CONTROLS:
 * - NEVER contains or exposes GROQ_API_KEY. All provider interactions run server-side.
 * - Explicitly distinguishes 'provider' (live AI) from 'mock' (simulation) and 'fallback' (verified clinical baseline).
 * - Never disguises failed AI requests as successful AI interpretations.
 * - Always falls back to static verified clinical text on error, missing credentials, rate limit, or timeout.
 * - Does not invent diagnoses, scores, or probabilities.
 */

export type ExplanationSource = 'provider' | 'mock' | 'fallback';

export interface ExplanationResponse<T> {
  success: boolean;
  source: ExplanationSource;
  data: T;
  model?: string;
  error?: string;
}

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
): Promise<ExplanationResponse<string>> {
  try {
    const res = await fetch('/api/groq/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'score_meaning',
        scoreData: input,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && typeof data?.text === 'string') {
      return {
        success: true,
        source: data.source === 'mock' ? 'mock' : 'provider',
        data: data.text.trim(),
        model: data.model,
      };
    }

    // Explicitly record that AI request was unavailable/failed and verified fallback is being used
    return {
      success: false,
      source: 'fallback',
      data: fallbackText,
      error: data?.message || data?.error || `Server responded with HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.warn('Groq score explanation fetch failed, using clinical fallback:', err?.message || err);
    return {
      success: false,
      source: 'fallback',
      data: fallbackText,
      error: err?.message || 'Network error communicating with AI gateway',
    };
  }
}

export async function fetchParameterExplanations(
  input: ParameterExplanationInput,
  fallbackMap: Record<string, string>
): Promise<ExplanationResponse<Record<string, string>>> {
  try {
    const res = await fetch('/api/groq/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parameter_impacts',
        parameterData: input,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success && data?.parameterExplanations && typeof data.parameterExplanations === 'object') {
      return {
        success: true,
        source: data.source === 'mock' ? 'mock' : 'provider',
        data: { ...fallbackMap, ...data.parameterExplanations },
        model: data.model,
      };
    }

    // Explicitly record that AI request was unavailable/failed and verified fallback is being used
    return {
      success: false,
      source: 'fallback',
      data: fallbackMap,
      error: data?.message || data?.error || `Server responded with HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.warn('Groq parameter explanations fetch failed, using clinical fallback:', err?.message || err);
    return {
      success: false,
      source: 'fallback',
      data: fallbackMap,
      error: err?.message || 'Network error communicating with AI gateway',
    };
  }
}
