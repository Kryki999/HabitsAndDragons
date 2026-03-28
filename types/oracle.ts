/** Six-axis habit profile from the Oracle (Groq). Sums to 1.0. */
export type OracleStatKey =
  | 'strength'
  | 'agility'
  | 'intelligence'
  | 'vitality'
  | 'spirit'
  | 'discipline';

export type OracleTaskStatWeights = Record<OracleStatKey, number>;

export type TaskOracleAnalysis = {
  weights: OracleTaskStatWeights;
  /** True when Groq returned valid JSON; false when fallback used. */
  fromAi: boolean;
};
