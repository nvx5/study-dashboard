import { CURRICULUM_TEXT, parseCurriculum, type CurriculumCategory } from "./curriculum";
import { ANKI_HEIGHT_DEFAULT, clampAnkiHeight } from "./anki-cycle";
import {
  DEFAULT_TAG_COLORS,
  DEFAULT_TAG_NAMES,
  TOPIC_COLUMNS_DEFAULT,
  clampTopicColumns,
  normalizeTagColors,
  normalizeTagNames,
} from "./display";
import { DATA_VERSION, type AppState, type Category } from "./types";

export const DEFAULT_TITLE = "MSRA Master Clinical Curriculum";
export const DEFAULT_THEME = "dark" as const;

function slug(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export function categoriesFromParsed(parsed: CurriculumCategory[]): Category[] {
  return parsed.map((category, categoryIndex) => ({
    id: `cat-${slug(categoryIndex)}`,
    name: category.name,
    order: categoryIndex,
    collapsed: false,
    topics: category.topics.map((name, topicIndex) => ({
      id: `cat-${slug(categoryIndex)}-t${slug(topicIndex)}`,
      name,
      confidence: "red" as const,
      order: topicIndex,
    })),
  }));
}

export function createDefaultState(): AppState {
  return {
    version: DATA_VERSION,
    title: DEFAULT_TITLE,
    theme: DEFAULT_THEME,
    source: CURRICULUM_TEXT,
    categories: categoriesFromParsed(parseCurriculum(CURRICULUM_TEXT)),
    ankiSource: "",
    ankiCards: [],
    ankiHidden: false,
    ankiHeightVh: ANKI_HEIGHT_DEFAULT,
    ankiCycleAt: Date.now(),
    topicColumns: TOPIC_COLUMNS_DEFAULT,
    tagNames: { ...DEFAULT_TAG_NAMES },
    tagColors: { ...DEFAULT_TAG_COLORS },
    updatedAt: Date.now(),
  };
}

export function stateFromSource(source: string, saved: AppState | null): AppState {
  const parsed = parseCurriculum(source);
  if (!parsed.length) {
    throw new Error('No categories found. Start a heading with "# " and list topics under it.');
  }

  const blueprint: AppState = {
    version: DATA_VERSION,
    title: saved?.title || DEFAULT_TITLE,
    theme: "dark",
    source,
    categories: categoriesFromParsed(parsed),
    ankiSource: saved?.ankiSource ?? "",
    ankiCards: saved?.ankiCards ?? [],
    ankiHidden: saved?.ankiHidden === true,
    ankiHeightVh: clampAnkiHeight(saved?.ankiHeightVh),
    ankiCycleAt: saved?.ankiCycleAt ?? saved?.updatedAt ?? Date.now(),
    topicColumns: clampTopicColumns(saved?.topicColumns),
    tagNames: normalizeTagNames(saved?.tagNames),
    tagColors: normalizeTagColors(saved?.tagColors),
    updatedAt: saved?.updatedAt ?? Date.now(),
  };

  return {
    ...mergeCurriculum(saved, blueprint),
    source,
  };
}

export function mergeCurriculum(saved: AppState | null, blueprint: AppState): AppState {
  const previous = new Map<string, Category>();
  const previousTopics = new Map<string, { confidence: Category["topics"][number]["confidence"]; id: string }>();

  if (saved) {
    for (const category of saved.categories) {
      previous.set(category.name, category);
      for (const topic of category.topics) {
        previousTopics.set(`${category.name}\0${topic.name}`, {
          id: topic.id,
          confidence: topic.confidence,
        });
      }
    }
  }

  return {
    version: DATA_VERSION,
    title: saved?.title || blueprint.title,
    theme: "dark",
    source: blueprint.source || saved?.source || CURRICULUM_TEXT,
    ankiSource: saved?.ankiSource ?? blueprint.ankiSource ?? "",
    ankiCards: saved?.ankiCards ?? blueprint.ankiCards ?? [],
    ankiHidden: saved?.ankiHidden === true,
    ankiHeightVh: clampAnkiHeight(saved?.ankiHeightVh ?? blueprint.ankiHeightVh),
    ankiCycleAt: saved?.ankiCycleAt ?? blueprint.ankiCycleAt,
    topicColumns: clampTopicColumns(saved?.topicColumns ?? blueprint.topicColumns),
    tagNames: normalizeTagNames(saved?.tagNames ?? blueprint.tagNames),
    tagColors: normalizeTagColors(saved?.tagColors ?? blueprint.tagColors),
    updatedAt: saved?.updatedAt ?? blueprint.updatedAt,
    categories: blueprint.categories.map((category, categoryIndex) => {
      const prior = previous.get(category.name);
      return {
        ...category,
        id: prior?.id ?? category.id,
        collapsed: prior?.collapsed === true,
        order: categoryIndex,
        topics: category.topics.map((topic, topicIndex) => {
          const priorTopic = previousTopics.get(`${category.name}\0${topic.name}`);
          return {
            ...topic,
            id: priorTopic?.id ?? topic.id,
            confidence: priorTopic?.confidence ?? "red",
            order: topicIndex,
          };
        }),
      };
    }),
  };
}
