import type { AppState, Topic } from "./types";

/**
 * Seed data used on first launch, and whenever storage is empty.
 * Edit this list to change the topics that appear after a fresh deploy.
 */
export const DEFAULT_TITLE = "Study topics";

export const DEFAULT_TOPICS: Topic[] = [
  { id: "cardio", name: "Cardiovascular physiology", confidence: "yellow", order: 0 },
  { id: "respiratory", name: "Respiratory physiology", confidence: "green", order: 1 },
  { id: "renal", name: "Renal physiology", confidence: "red", order: 2 },
  { id: "neuro", name: "Neuroanatomy", confidence: "red", order: 3 },
  { id: "pharm", name: "Pharmacology", confidence: "yellow", order: 4 },
  { id: "immuno", name: "Immunology", confidence: "green", order: 5 },
  { id: "endo", name: "Endocrinology", confidence: "yellow", order: 6 },
  { id: "micro", name: "Microbiology", confidence: "red", order: 7 },
];

export function createDefaultState(): AppState {
  return {
    title: DEFAULT_TITLE,
    topics: DEFAULT_TOPICS.map((topic) => ({ ...topic })),
    updatedAt: Date.now(),
  };
}
