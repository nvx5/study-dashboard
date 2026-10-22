import { env } from "cloudflare:workers";
import {
  DEFAULT_TAG_COLORS,
  DEFAULT_TAG_NAMES,
  TOPIC_COLUMNS_DEFAULT,
  clampTopicColumns,
  normalizeTagColors,
  normalizeTagNames,
} from "./display";
import { CURRICULUM_TEXT } from "./curriculum";
import { createDefaultState, mergeCurriculum, stateFromSource } from "./defaults";
import { DATA_VERSION, type AppState } from "./types";
import { normalizeState } from "./validate";

const SCHEMA = `CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)`;

function getDb(): D1Database {
  const db = env.DB;
  if (!db) {
    throw new Error("Missing D1 binding: DB");
  }
  return db;
}

async function ensureSchema(db: D1Database): Promise<void> {
  await db.prepare(SCHEMA).run();
}

async function writeState(db: D1Database, state: AppState): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .bind(JSON.stringify(state), state.updatedAt)
    .run();
}

export async function getState(): Promise<AppState> {
  const db = getDb();
  await ensureSchema(db);

  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id = 1")
    .first<{ payload: string }>();

  if (!row) {
    const initial = createDefaultState();
    try {
      await writeState(db, initial);
    } catch {
      const existing = await db
        .prepare("SELECT payload FROM app_state WHERE id = 1")
        .first<{ payload: string }>();
      if (existing) {
        return hydrate(parsePayload(existing.payload));
      }
    }
    return initial;
  }

  const saved = parsePayload(row.payload);
  const state = hydrate(saved);
  if (!saved?.source) {
    await writeState(db, { ...state, updatedAt: saved?.updatedAt ?? state.updatedAt });
  }
  return state;
}

export async function setState(
  next: Pick<AppState, "title" | "theme" | "categories"> & {
    source?: string;
    topicColumns?: number;
    tagNames?: AppState["tagNames"];
    tagColors?: AppState["tagColors"];
  },
): Promise<AppState> {
  const db = getDb();
  await ensureSchema(db);
  const current = await getState();

  let state =
    typeof next.source === "string"
      ? stateFromSource(next.source, { ...current, categories: next.categories })
      : {
          ...current,
          title: next.title,
          theme: "dark" as const,
          categories: next.categories.map((category, categoryIndex) => ({
            ...category,
            order: categoryIndex,
            topics: category.topics.map((topic, topicIndex) => ({ ...topic, order: topicIndex })),
          })),
        };

  if (typeof next.topicColumns === "number") {
    state = { ...state, topicColumns: clampTopicColumns(next.topicColumns) };
  }
  if (next.tagNames) {
    state = { ...state, tagNames: normalizeTagNames(next.tagNames) };
  }
  if (next.tagColors) {
    state = { ...state, tagColors: normalizeTagColors(next.tagColors) };
  }

  const saved: AppState = {
    ...state,
    version: DATA_VERSION,
    updatedAt: Date.now(),
  };

  await writeState(db, saved);
  return saved;
}

function parsePayload(payload: string): AppState | null {
  try {
    return normalizeState(JSON.parse(payload));
  } catch {
    return null;
  }
}

function hydrate(saved: AppState | null): AppState {
  if (!saved) return createDefaultState();
  const next = {
    ...saved,
    topicColumns: clampTopicColumns(saved.topicColumns ?? TOPIC_COLUMNS_DEFAULT),
    tagNames: normalizeTagNames(saved.tagNames ?? DEFAULT_TAG_NAMES),
    tagColors: normalizeTagColors(saved.tagColors ?? DEFAULT_TAG_COLORS),
  };
  if (next.source) return next;
  return {
    ...mergeCurriculum(next, createDefaultState()),
    source: CURRICULUM_TEXT,
    updatedAt: saved.updatedAt,
  };
}
