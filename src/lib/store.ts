import { env } from "cloudflare:workers";
import { parseAnki } from "./anki";
import { ANKI_HEIGHT_DEFAULT, clampAnkiHeight } from "./anki-cycle";
import { TOPIC_COLUMNS_DEFAULT, clampTopicColumns } from "./display";
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
    ankiSource?: string;
    ankiHidden?: boolean;
    ankiHeightVh?: number;
    ankiCycleAt?: number;
    topicColumns?: number;
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

  if (typeof next.ankiSource === "string") {
    state = {
      ...state,
      ankiSource: next.ankiSource,
      ankiCards: parseAnki(next.ankiSource),
      ankiCycleAt: Date.now(),
    };
  } else {
    state = {
      ...state,
      ankiSource: current.ankiSource,
      ankiCards: current.ankiCards,
    };
  }

  if (typeof next.ankiHidden === "boolean") {
    state = { ...state, ankiHidden: next.ankiHidden };
  }
  if (typeof next.ankiHeightVh === "number") {
    state = { ...state, ankiHeightVh: clampAnkiHeight(next.ankiHeightVh) };
  }
  if (typeof next.topicColumns === "number") {
    state = { ...state, topicColumns: clampTopicColumns(next.topicColumns) };
  }
  if (typeof next.ankiCycleAt === "number" && Number.isFinite(next.ankiCycleAt)) {
    state = { ...state, ankiCycleAt: next.ankiCycleAt };
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
  const withAnki = {
    ...saved,
    ankiSource: saved.ankiSource ?? "",
    ankiCards: saved.ankiCards ?? [],
    ankiHidden: saved.ankiHidden === true,
    ankiHeightVh: clampAnkiHeight(saved.ankiHeightVh ?? ANKI_HEIGHT_DEFAULT),
    ankiCycleAt:
      typeof saved.ankiCycleAt === "number" && Number.isFinite(saved.ankiCycleAt)
        ? saved.ankiCycleAt
        : saved.updatedAt,
    topicColumns: clampTopicColumns(saved.topicColumns ?? TOPIC_COLUMNS_DEFAULT),
  };
  if (withAnki.source) return withAnki;
  return {
    ...mergeCurriculum(withAnki, createDefaultState()),
    source: CURRICULUM_TEXT,
    updatedAt: saved.updatedAt,
  };
}
