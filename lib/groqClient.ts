const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

export function getGroqApiKey(): string | undefined {
  const a = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim();
  const b = process.env.GROQ_API_KEY?.trim();
  return a || b || undefined;
}

export type GroqChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type GroqChatRequest = {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** When supported by the model, constrains output to JSON. */
  response_format?: { type: 'json_object' };
};

type GroqChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

/**
 * Single low-level call to Groq OpenAI-compatible chat API.
 * Reused by Sage chat and Oracle stat analysis.
 */
export async function postGroqChatCompletion(
  body: GroqChatRequest,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return { ok: false, error: 'missing_api_key' };
  }

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model ?? DEFAULT_GROQ_MODEL,
        messages: body.messages,
        temperature: body.temperature ?? 0.5,
        max_tokens: body.max_tokens ?? 256,
        ...(body.response_format ? { response_format: body.response_format } : {}),
      }),
    });

    const data = (await res.json()) as GroqChatResponse;

    if (!res.ok) {
      console.warn('[groqClient] error', res.status, data?.error?.message);
      return { ok: false, error: data?.error?.message ?? `http_${res.status}` };
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: 'empty_choices' };
    }
    return { ok: true, content };
  } catch (e) {
    console.warn('[groqClient] fetch failed', e);
    return { ok: false, error: 'network' };
  }
}
