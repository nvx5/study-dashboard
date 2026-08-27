export const ANKI_FRONT_MS = 30_000;
export const ANKI_CARD_MS = 120_000;
export const ANKI_HEIGHT_MIN = 12;
export const ANKI_HEIGHT_MAX = 40;
export const ANKI_HEIGHT_DEFAULT = 26;

export type AnkiCycle = {
  index: number;
  showBack: boolean;
  stageRemain: number;
  cardRemain: number;
};

export function clampAnkiHeight(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ANKI_HEIGHT_DEFAULT;
  return Math.min(ANKI_HEIGHT_MAX, Math.max(ANKI_HEIGHT_MIN, Math.round(n)));
}

export function ankiCycle(now: number, cycleAt: number, count: number): AnkiCycle | null {
  if (count <= 0) return null;
  const origin = Number.isFinite(cycleAt) ? cycleAt : now;
  const elapsed = Math.max(0, now - origin);
  const index = Math.floor(elapsed / ANKI_CARD_MS) % count;
  const inCard = elapsed % ANKI_CARD_MS;
  const showBack = inCard >= ANKI_FRONT_MS;
  const stageEnd = showBack ? ANKI_CARD_MS : ANKI_FRONT_MS;
  return {
    index,
    showBack,
    stageRemain: stageEnd - inCard,
    cardRemain: ANKI_CARD_MS - inCard,
  };
}

export function cycleAtForFront(now: number, index: number): number {
  return now - index * ANKI_CARD_MS;
}

export function cycleAtForBack(now: number, index: number): number {
  return now - (index * ANKI_CARD_MS + ANKI_FRONT_MS);
}
