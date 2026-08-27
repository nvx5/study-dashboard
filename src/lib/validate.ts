import { parseAnki, MAX_ANKI_SOURCE_LENGTH } from "./anki";
import { ANKI_HEIGHT_DEFAULT, clampAnkiHeight } from "./anki-cycle";
import {
  TOPIC_COLUMNS_DEFAULT,
  clampTopicColumns,
  normalizeTagColors,
  normalizeTagNames,
} from "./display";
import { CURRICULUM_TEXT, parseCurriculum } from "./curriculum";
import {
  CONFIDENCE,
  DATA_VERSION,
  MAX_CATEGORIES,
  MAX_NAME_LENGTH,
  MAX_SOURCE_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TOPICS_PER_CATEGORY,
  THEMES,
  type AppState,
  type Category,
  type Confidence,
  type Theme,
  type Topic,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && (CONFIDENCE as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function parseTopic(item: unknown, label: string, seen: Set<string>): Topic {
  if (!isRecord(item)) {
    throw new Error(`${label} is invalid`);
  }

  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id || id.length > 64) {
    throw new Error(`${label} is missing a valid id`);
  }
  if (seen.has(id)) {
    throw new Error("Topic ids must be unique");
  }
  seen.add(id);

  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) {
    throw new Error(`${label} needs a name`);
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Names must be ${MAX_NAME_LENGTH} characters or fewer`);
  }

  if (!isConfidence(item.confidence)) {
    throw new Error(`${label} has an invalid confidence value`);
  }

  return {
    id,
    name,
    confidence: item.confidence,
    order: 0,
  };
}

export function parseIncomingState(
  body: unknown,
): Pick<AppState, "title" | "theme" | "categories"> & {
  source?: string;
  ankiSource?: string;
  ankiHidden?: boolean;
  ankiHeightVh?: number;
  ankiCycleAt?: number;
  topicColumns?: number;
  tagNames?: AppState["tagNames"];
  tagColors?: AppState["tagColors"];
} {
  if (!isRecord(body)) {
    throw new Error("Body must be an object");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    throw new Error("Title is required");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }

  const theme: Theme = isTheme(body.theme) ? body.theme : "dark";

  let source: string | undefined;
  if (typeof body.source === "string") {
    source = body.source.replace(/\r\n/g, "\n");
    if (source.length > MAX_SOURCE_LENGTH) {
      throw new Error("curriculum.txt is too long");
    }
    const parsed = parseCurriculum(source);
    if (!parsed.length) {
      throw new Error('No categories found. Start a heading with "# " and list topics under it.');
    }
    if (parsed.length > MAX_CATEGORIES) {
      throw new Error(`At most ${MAX_CATEGORIES} categories are allowed`);
    }
    for (const category of parsed) {
      if (category.name.length > MAX_NAME_LENGTH) {
        throw new Error(`Names must be ${MAX_NAME_LENGTH} characters or fewer`);
      }
      if (category.topics.length > MAX_TOPICS_PER_CATEGORY) {
        throw new Error(`At most ${MAX_TOPICS_PER_CATEGORY} topics per category`);
      }
      for (const topic of category.topics) {
        if (topic.length > MAX_NAME_LENGTH) {
          throw new Error(`Names must be ${MAX_NAME_LENGTH} characters or fewer`);
        }
      }
    }
  }

  let ankiSource: string | undefined;
  if (typeof body.ankiSource === "string") {
    ankiSource = body.ankiSource.replace(/\r\n/g, "\n");
    if (ankiSource.length > MAX_ANKI_SOURCE_LENGTH) {
      throw new Error("anki.txt is too long");
    }
  }

  let ankiHidden: boolean | undefined;
  if (typeof body.ankiHidden === "boolean") {
    ankiHidden = body.ankiHidden;
  }

  let ankiHeightVh: number | undefined;
  if (body.ankiHeightVh !== undefined) {
    ankiHeightVh = clampAnkiHeight(body.ankiHeightVh);
  }

  let ankiCycleAt: number | undefined;
  if (typeof body.ankiCycleAt === "number" && Number.isFinite(body.ankiCycleAt)) {
    const now = Date.now();
    ankiCycleAt = Math.round(body.ankiCycleAt);
    if (ankiCycleAt > now + 5000) ankiCycleAt = now;
    if (ankiCycleAt < now - 366 * 24 * 60 * 60 * 1000) ankiCycleAt = now;
  }

  let topicColumns: number | undefined;
  if (body.topicColumns !== undefined) {
    topicColumns = clampTopicColumns(body.topicColumns);
  }

  let tagNames: AppState["tagNames"] | undefined;
  if (body.tagNames !== undefined) {
    tagNames = normalizeTagNames(body.tagNames);
  }

  let tagColors: AppState["tagColors"] | undefined;
  if (body.tagColors !== undefined) {
    tagColors = normalizeTagColors(body.tagColors);
  }

  if (!Array.isArray(body.categories)) {
    throw new Error("categories must be an array");
  }
  if (body.categories.length > MAX_CATEGORIES) {
    throw new Error(`At most ${MAX_CATEGORIES} categories are allowed`);
  }

  const seen = new Set<string>();
  const categories: Category[] = body.categories.map((item, categoryIndex) => {
    if (!isRecord(item)) {
      throw new Error(`Category ${categoryIndex + 1} is invalid`);
    }

    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id || id.length > 64) {
      throw new Error(`Category ${categoryIndex + 1} is missing a valid id`);
    }
    if (seen.has(id)) {
      throw new Error("Category ids must be unique");
    }
    seen.add(id);

    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      throw new Error(`Category ${categoryIndex + 1} needs a name`);
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`Names must be ${MAX_NAME_LENGTH} characters or fewer`);
    }

    if (!Array.isArray(item.topics)) {
      throw new Error(`Category ${name} is missing topics`);
    }
    if (item.topics.length > MAX_TOPICS_PER_CATEGORY) {
      throw new Error(`At most ${MAX_TOPICS_PER_CATEGORY} topics per category`);
    }

    const topics = item.topics.map((topic, topicIndex) =>
      parseTopic(topic, `Topic ${topicIndex + 1} in ${name}`, seen),
    );

    return {
      id,
      name,
      collapsed: item.collapsed === true,
      order: categoryIndex,
      topics: topics.map((topic, index) => ({ ...topic, order: index })),
    };
  });

  return {
    title,
    theme,
    categories,
    ...(source !== undefined ? { source } : {}),
    ...(ankiSource !== undefined ? { ankiSource } : {}),
    ...(ankiHidden !== undefined ? { ankiHidden } : {}),
    ...(ankiHeightVh !== undefined ? { ankiHeightVh } : {}),
    ...(ankiCycleAt !== undefined ? { ankiCycleAt } : {}),
    ...(topicColumns !== undefined ? { topicColumns } : {}),
    ...(tagNames !== undefined ? { tagNames } : {}),
    ...(tagColors !== undefined ? { tagColors } : {}),
  };
}

export function normalizeState(value: unknown): AppState | null {
  try {
    if (!isRecord(value) || value.version !== DATA_VERSION) {
      return null;
    }
    const parsed = parseIncomingState(value);
    const updatedAt =
      typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now();
    const ankiSource =
      parsed.ankiSource ?? (typeof value.ankiSource === "string" ? value.ankiSource : "");
    return {
      ...parsed,
      source: parsed.source ?? CURRICULUM_TEXT,
      ankiSource,
      ankiCards: parseAnki(ankiSource),
      ankiHidden: value.ankiHidden === true,
      ankiHeightVh: clampAnkiHeight(value.ankiHeightVh ?? ANKI_HEIGHT_DEFAULT),
      ankiCycleAt:
        typeof value.ankiCycleAt === "number" && Number.isFinite(value.ankiCycleAt)
          ? value.ankiCycleAt
          : updatedAt,
      topicColumns: clampTopicColumns(value.topicColumns ?? TOPIC_COLUMNS_DEFAULT),
      tagNames: normalizeTagNames(parsed.tagNames ?? value.tagNames),
      tagColors: normalizeTagColors(parsed.tagColors ?? value.tagColors),
      version: DATA_VERSION,
      updatedAt,
    };
  } catch {
    return null;
  }
}
