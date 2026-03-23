import type { PlayerClass, SageChatMessage, SageLifeFocus } from '@/types/game';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

/** Odpowiedź przy błędzie sieci / API — spójna z lore gry. */
export const SAGE_ERROR_ORACLE =
  'Mgła zasłania kulę… nić magii między nami drga w nieznany sposób. Spróbuj ponownie, gdy eter się uspokoi, wędrowcze.';

export type SageLlmContext = {
  playerClass: PlayerClass | null;
  level: number;
  streak: number;
  sageFocus: SageLifeFocus;
};

function classLabel(pl: PlayerClass | null): string {
  if (!pl) return 'nie wybrana (wędrowiec bez herbu)';
  if (pl === 'warrior') return 'Wojownik';
  if (pl === 'hunter') return 'Łowca';
  return 'Mag';
}

function focusLabel(f: SageLifeFocus): string {
  if (f === 'body') return 'ciało — zdrowie, ruch, kondycja, sen';
  if (f === 'mind') return 'umysł — nauka, koncentracja, spokój, rozwój wewnętrzny';
  return 'praca — kariera, dyscyplina, nawyki zawodowe, konsekwencja';
}

export function buildSageSystemPrompt(ctx: SageLlmContext): string {
  return [
    'Jesteś Starszym Mędrcem w świecie RPG „Habits & Dragons”.',
    'Mówisz po polsku. Ton: mistyczny, jak u mądrego NPC z gry — bez przesadnej patetyki i bez moralizatorskiego tonu nauczyciela.',
    'Twoje zadanie: krótko motywować gracza (nazywaj go „wędrowcem”), by budował nawyki w prawdziwym życiu — konkretnie, ciepło, z odrobiną symboliki RPG.',
    'ZAWSZE nawiązuj w radzie do aktualnego „Celu życiowego” gracza — to najważniejszy wątek.',
    'Odpowiadaj BARDZO zwięźle: maksymalnie 2–3 krótkie zdania. Bez list punktowanych, bez „Jako Mędrzec…”.',
    '',
    'Kontekst stanu gracza (użyj go naturalnie w jednym zdaniu lub jako podtekst, nie wypisuj suchych statystyk):',
    `- Klasa: ${classLabel(ctx.playerClass)}`,
    `- Poziom postaci: ${ctx.level}`,
    `- Streak (serie dni): ${ctx.streak} (ogień 🔥 = konsekwencja)`,
    `- Cel życiowy / fokus rad: ${focusLabel(ctx.sageFocus)}`,
    '',
    'Jeśli gracz pyta o coś poza nawykami, odpowiedz krótko i delikatnie sprowadź rozmowę do małego kroku nawykowego związanego z jego fokusem.',
  ].join('\n');
}

function getGroqApiKey(): string | undefined {
  const a = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim();
  const b = process.env.GROQ_API_KEY?.trim();
  return a || b || undefined;
}

type GroqChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export async function fetchSageReply(
  history: SageChatMessage[],
  ctx: SageLlmContext,
  options?: { model?: string },
): Promise<{ text: string; fromError: boolean }> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return { text: SAGE_ERROR_ORACLE, fromError: true };
  }

  const system = buildSageSystemPrompt(ctx);
  const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    ...history.map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
  ];

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model ?? DEFAULT_MODEL,
        messages: apiMessages,
        temperature: 0.75,
        max_tokens: 180,
      }),
    });

    const data = (await res.json()) as GroqChatResponse;

    if (!res.ok) {
      console.warn('[sageLlm] Groq error', res.status, data?.error?.message);
      return { text: SAGE_ERROR_ORACLE, fromError: true };
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { text: SAGE_ERROR_ORACLE, fromError: true };
    }
    return { text, fromError: false };
  } catch (e) {
    console.warn('[sageLlm] fetch failed', e);
    return { text: SAGE_ERROR_ORACLE, fromError: true };
  }
}
