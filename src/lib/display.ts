export const TOPIC_COLUMNS_MIN = 1;
export const TOPIC_COLUMNS_MAX = 4;
export const TOPIC_COLUMNS_DEFAULT = 2;

export function clampTopicColumns(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return TOPIC_COLUMNS_DEFAULT;
  return Math.min(TOPIC_COLUMNS_MAX, Math.max(TOPIC_COLUMNS_MIN, Math.round(n)));
}
