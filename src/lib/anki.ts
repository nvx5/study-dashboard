export type AnkiCard = {
  front: string;
  back: string;
};

export const ANKI_FILENAME = "anki.txt";
export const MAX_ANKI_SOURCE_LENGTH = 500_000;
export const MAX_ANKI_CARDS = 8_000;

const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function splitClozeInner(inner: string): { answer: string; hint: string } {
  const index = inner.indexOf("::");
  if (index === -1) return { answer: inner, hint: "" };
  return { answer: inner.slice(0, index), hint: inner.slice(index + 2) };
}

function clozeNumbers(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(new RegExp(CLOZE_RE.source, "g"))) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

function renderClozes(text: string, active: number, side: "front" | "back"): string {
  const parts: string[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(CLOZE_RE.source, "g"))) {
    const index = match.index ?? 0;
    parts.push(escapeHtml(text.slice(last, index)));
    const { answer, hint } = splitClozeInner(match[2] ?? "");
    if (Number(match[1]) !== active) {
      parts.push(escapeHtml(answer));
    } else if (side === "front") {
      parts.push(`<span class="cloze">[${escapeHtml(hint || "...")}]</span>`);
    } else {
      parts.push(`<span class="cloze">${escapeHtml(answer)}</span>`);
    }
    last = index + match[0].length;
  }
  parts.push(escapeHtml(text.slice(last)));
  return parts.join("").replace(/\n/g, "<br>");
}

function cardsFromNote(text: string, extra: string): AnkiCard[] {
  const numbers = clozeNumbers(text);
  if (!numbers.length) {
    if (!text.trim() || !extra.trim()) return [];
    return [{ front: withBreaks(text.trim()), back: withBreaks(extra.trim()) }];
  }

  return numbers.map((active) => {
    const front = renderClozes(text, active, "front");
    const revealed = renderClozes(text, active, "back");
    const extraHtml = extra.trim()
      ? `<hr class="anki-extra-rule" /><div class="anki-extra">${withBreaks(extra.trim())}</div>`
      : "";
    return { front, back: revealed + extraHtml };
  });
}

export function parseAnki(text: string): AnkiCard[] {
  const raw = text.replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const hasTab = lines.some((line) => line.includes("\t") && line.trim() && !line.trim().startsWith("#"));
  const cards: AnkiCard[] = [];

  function pushNote(note: string, extra: string) {
    for (const card of cardsFromNote(note, extra)) {
      if (cards.length >= MAX_ANKI_CARDS) return;
      cards.push(card);
    }
  }

  if (hasTab) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
      const tab = line.indexOf("\t");
      const note = (tab === -1 ? line : line.slice(0, tab)).trim();
      const extra = tab === -1 ? "" : line.slice(tab + 1).trim();
      pushNote(note, extra);
      if (cards.length >= MAX_ANKI_CARDS) break;
    }
    return cards;
  }

  const blocks = raw.split(/\n\s*\n/);
  for (const block of blocks) {
    const parts = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));
    if (!parts.length) continue;
    if (clozeNumbers(parts.join("\n")).length) {
      pushNote(parts[0], parts.slice(1).join("\n"));
    } else if (parts.length >= 2) {
      pushNote(parts[0], parts.slice(1).join("\n"));
    }
    if (cards.length >= MAX_ANKI_CARDS) break;
  }

  return cards;
}
