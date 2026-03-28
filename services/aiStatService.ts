import type { StatType } from '@/types/game';
import type { OracleStatKey, OracleTaskStatWeights, TaskOracleAnalysis } from '@/types/oracle';
import { DEFAULT_GROQ_MODEL, postGroqChatCompletion } from '@/lib/groqClient';

const ORACLE_KEYS: OracleStatKey[] = [
  'strength',
  'agility',
  'intelligence',
  'vitality',
  'spirit',
  'discipline',
];

const EQUAL_WEIGHT = 1 / 6;

function equalFallbackWeights(): OracleTaskStatWeights {
  return {
    strength: EQUAL_WEIGHT,
    agility: EQUAL_WEIGHT,
    intelligence: EQUAL_WEIGHT,
    vitality: EQUAL_WEIGHT,
    spirit: EQUAL_WEIGHT,
    discipline: EQUAL_WEIGHT,
  };
}

function normalizeWeights(raw: Partial<Record<string, unknown>>): OracleTaskStatWeights | null {
  const nums: Partial<Record<OracleStatKey, number>> = {};
  for (const key of ORACLE_KEYS) {
    const v = raw[key];
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    if (!Number.isFinite(n) || n < 0) return null;
    nums[key] = n;
  }
  const sum = ORACLE_KEYS.reduce((acc, k) => acc + (nums[k] ?? 0), 0);
  if (sum <= 0) return null;
  const out = {} as OracleTaskStatWeights;
  for (const k of ORACLE_KEYS) {
    out[k] = (nums[k] ?? 0) / sum;
  }
  return out;
}

/** Strip optional ```json fences from model output. */
function extractJsonObject(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) return fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export function mapOracleWeightsToGameStat(w: OracleTaskStatWeights): StatType {
  const body = w.strength + w.vitality;
  const pace = w.agility + w.discipline * 0.55;
  const mind = w.intelligence + w.spirit + w.discipline * 0.45;
  if (body >= pace && body >= mind) return 'strength';
  if (pace >= mind) return 'agility';
  return 'intelligence';
}

const ORACLE_SYSTEM_PROMPT = [
  'You are an RPG rules engine for a habit-building game.',
  'Analyze the habit name and description.',
  'Distribute exactly 1.0 point across these six stats (use decimals that sum to 1.0):',
  'strength, agility, intelligence, vitality, spirit, discipline.',
  '- strength: physical power, lifting, intense exertion',
  '- agility: speed, mobility, coordination, quick routines',
  '- intelligence: learning, study, strategy, deep thinking',
  '- vitality: health, sleep, hydration, nutrition, recovery',
  '- spirit: mindfulness, calm, purpose, emotional balance',
  '- discipline: consistency, schedules, follow-through, rules',
  'Return ONLY a single JSON object with exactly those six keys and numeric values. No markdown, no explanation, no code fences.',
].join('\n');

export type AnalyzeTaskResult = TaskOracleAnalysis & {
  /** Maps Oracle blend to existing three-stat gameplay axis. */
  gameStat: StatType;
};

export const AIStatService = {
  /**
   * Calls Groq (LLaMA 3 class model) to split 1.0 across six oracle stats.
   * On any failure, returns equal weights (~0.1667 each) and fromAi: false.
   */
  async analyzeTask(taskTitle: string, taskDescription: string): Promise<AnalyzeTaskResult> {
    const title = taskTitle.trim() || 'Untitled habit';
    const desc = taskDescription.trim() || title;

    const userPayload = JSON.stringify({ name: title, description: desc });

    const messages = [
      { role: 'system' as const, content: ORACLE_SYSTEM_PROMPT },
      { role: 'user' as const, content: userPayload },
    ];

    let res = await postGroqChatCompletion({
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      response_format: { type: 'json_object' },
      messages,
    });

    if (!res.ok) {
      res = await postGroqChatCompletion({
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages,
      });
    }

    if (!res.ok) {
      const w = equalFallbackWeights();
      return { weights: w, fromAi: false, gameStat: mapOracleWeightsToGameStat(w) };
    }

    try {
      const jsonStr = extractJsonObject(res.content);
      const parsed = JSON.parse(jsonStr) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('not_object');
      }
      const normalized = normalizeWeights(parsed as Partial<Record<string, unknown>>);
      if (!normalized) {
        throw new Error('bad_weights');
      }
      return {
        weights: normalized,
        fromAi: true,
        gameStat: mapOracleWeightsToGameStat(normalized),
      };
    } catch {
      const w = equalFallbackWeights();
      return { weights: w, fromAi: false, gameStat: mapOracleWeightsToGameStat(w) };
    }
  },
};
