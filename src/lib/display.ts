import { CONFIDENCE, STATUS_LABEL, type Confidence } from "./types";

export const TOPIC_COLUMNS_MIN = 1;
export const TOPIC_COLUMNS_MAX = 4;
export const TOPIC_COLUMNS_DEFAULT = 2;
export const MAX_TAG_NAME_LENGTH = 24;

export const DEFAULT_TAG_NAMES: Record<Confidence, string> = {
  red: STATUS_LABEL.red,
  yellow: STATUS_LABEL.yellow,
  green: STATUS_LABEL.green,
};

export const DEFAULT_TAG_COLORS: Record<Confidence, string> = {
  red: "#6e2020",
  yellow: "#5c3d00",
  green: "#12261e",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampTopicColumns(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return TOPIC_COLUMNS_DEFAULT;
  return Math.min(TOPIC_COLUMNS_MAX, Math.max(TOPIC_COLUMNS_MIN, Math.round(n)));
}

export function splitIntoColumns<T>(items: T[], columns: unknown): T[][] {
  const n = clampTopicColumns(columns);
  const cols: T[][] = [];
  for (let i = 0; i < n; i++) cols.push([]);
  for (let i = 0; i < items.length; i++) cols[i % n].push(items[i]);
  return cols;
}

export function parseHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const short = /^#?([0-9a-fA-F]{3})$/.exec(raw);
  if (short) {
    const h = short[1];
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  const full = /^#?([0-9a-fA-F]{6})$/.exec(raw);
  if (full) return `#${full[1]}`.toLowerCase();
  return null;
}

export function clampTagName(value: unknown, fallback: string): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return fallback;
  return name.length > MAX_TAG_NAME_LENGTH ? name.slice(0, MAX_TAG_NAME_LENGTH) : name;
}

export function normalizeTagNames(value: unknown): Record<Confidence, string> {
  const rec = isRecord(value) ? value : {};
  return {
    red: clampTagName(rec.red, DEFAULT_TAG_NAMES.red),
    yellow: clampTagName(rec.yellow, DEFAULT_TAG_NAMES.yellow),
    green: clampTagName(rec.green, DEFAULT_TAG_NAMES.green),
  };
}

export function normalizeTagColors(value: unknown): Record<Confidence, string> {
  const rec = isRecord(value) ? value : {};
  return {
    red: parseHexColor(rec.red) ?? DEFAULT_TAG_COLORS.red,
    yellow: parseHexColor(rec.yellow) ?? DEFAULT_TAG_COLORS.yellow,
    green: parseHexColor(rec.green) ?? DEFAULT_TAG_COLORS.green,
  };
}

export function tagSwatch(hex: string): { bg: string; text: string; border: string } {
  const parsed = parseHexColor(hex) ?? DEFAULT_TAG_COLORS.red;
  const r = parseInt(parsed.slice(1, 3), 16);
  const g = parseInt(parsed.slice(3, 5), 16);
  const b = parseInt(parsed.slice(5, 7), 16);
  const lin = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const text = luminance > 0.45 ? "#111111" : "#ffffff";
  const mix = luminance > 0.45 ? 0.22 : 0.28;
  const toward = luminance > 0.45 ? 0 : 255;
  const channel = (value: number) => {
    const n = Math.round(value + (toward - value) * mix);
    return n.toString(16).padStart(2, "0");
  };
  return { bg: parsed, text, border: `#${channel(r)}${channel(g)}${channel(b)}` };
}

export function tagCssVars(colors: unknown): string {
  const normalized = normalizeTagColors(colors);
  const parts: string[] = [];
  for (const key of CONFIDENCE) {
    const swatch = tagSwatch(normalized[key]);
    parts.push(`--tag-${key}-bg:${swatch.bg}`);
    parts.push(`--tag-${key}-text:${swatch.text}`);
    parts.push(`--tag-${key}-border:${swatch.border}`);
  }
  return parts.join(";");
}
