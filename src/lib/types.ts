export const CONFIDENCE = ["red", "yellow", "green"] as const;
export const THEMES = ["light", "dark"] as const;

export type Confidence = (typeof CONFIDENCE)[number];
export type Theme = (typeof THEMES)[number];

export type Topic = {
  id: string;
  name: string;
  confidence: Confidence;
  order: number;
};

export type Category = {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  topics: Topic[];
};

export type AppState = {
  version: number;
  title: string;
  theme: Theme;
  source: string;
  categories: Category[];
  topicColumns: number;
  tagNames: Record<Confidence, string>;
  tagColors: Record<Confidence, string>;
  updatedAt: number;
};

export const STATUS_LABEL: Record<Confidence, string> = {
  red: "Needs study",
  yellow: "Improving",
  green: "Confident",
};

export const DATA_VERSION = 2;
export const MAX_CATEGORIES = 80;
export const MAX_TOPICS_PER_CATEGORY = 100;
export const MAX_NAME_LENGTH = 200;
export const MAX_TITLE_LENGTH = 120;
export const MAX_SOURCE_LENGTH = 200_000;
