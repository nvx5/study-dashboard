import { CONFIDENCE, type Category, type Confidence, type Topic } from "./types";

export const PEOPLE = ["nil", "jasmine"] as const;
export type PersonId = (typeof PEOPLE)[number];

export const DEFAULT_PERSON_NAMES: Record<PersonId, string> = {
  nil: "N",
  jasmine: "J",
};

export const PERSON_PAGE_TITLE: Record<PersonId, string> = {
  nil: "Nil",
  jasmine: "Jasmine",
};

export const MAX_PERSON_NAME_LENGTH = 16;

export function isPersonId(value: unknown): value is PersonId {
  return value === "nil" || value === "jasmine";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampPersonName(value: unknown, fallback: string): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return fallback;
  return name.length > MAX_PERSON_NAME_LENGTH ? name.slice(0, MAX_PERSON_NAME_LENGTH) : name;
}

export function normalizePersonNames(value: unknown): Record<PersonId, string> {
  const rec = isRecord(value) ? value : {};
  return {
    nil: clampPersonName(rec.nil, DEFAULT_PERSON_NAMES.nil),
    jasmine: clampPersonName(rec.jasmine, DEFAULT_PERSON_NAMES.jasmine),
  };
}

export function mergePersonNames(current: unknown, patch: unknown): Record<PersonId, string> {
  const base = normalizePersonNames(current);
  if (!isRecord(patch)) return base;
  return {
    nil: patch.nil !== undefined ? clampPersonName(patch.nil, base.nil) : base.nil,
    jasmine: patch.jasmine !== undefined ? clampPersonName(patch.jasmine, base.jasmine) : base.jasmine,
  };
}

export function personDisplayName(names: unknown, person: PersonId): string {
  return normalizePersonNames(names)[person];
}

export function parseConfidence(value: unknown, fallback: Confidence = "red"): Confidence {
  return typeof value === "string" && (CONFIDENCE as readonly string[]).includes(value)
    ? (value as Confidence)
    : fallback;
}

export function topicConfidence(topic: Pick<Topic, "confidence" | "jasmine">, person: PersonId): Confidence {
  return person === "jasmine" ? parseConfidence(topic.jasmine) : parseConfidence(topic.confidence);
}

export function applyPersonRatings(current: Category[], incoming: Category[], person: PersonId): Category[] {
  const next = new Map<string, Confidence>();
  for (const category of incoming) {
    for (const topic of category.topics) {
      next.set(topic.id, topicConfidence(topic, person));
    }
  }
  return current.map((category) => ({
    ...category,
    topics: category.topics.map((topic) => {
      const value = next.get(topic.id);
      if (!value) return topic;
      if (person === "jasmine") return { ...topic, jasmine: value };
      return { ...topic, confidence: value };
    }),
  }));
}
