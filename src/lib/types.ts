export const CONFIDENCE = ["red", "yellow", "green"] as const;

export type Confidence = (typeof CONFIDENCE)[number];

export type Topic = {
  id: string;
  name: string;
  confidence: Confidence;
  order: number;
};

export type AppState = {
  title: string;
  topics: Topic[];
  updatedAt: number;
};

export const STATUS_LABEL: Record<Confidence, string> = {
  red: "Needs study",
  yellow: "Improving",
  green: "Confident",
};

export const MAX_TOPICS = 200;
export const MAX_NAME_LENGTH = 200;
export const MAX_TITLE_LENGTH = 80;
