import { env } from "cloudflare:workers";
import { createDefaultState } from "./defaults";
import type { AppState } from "./types";
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

export async function getState(): Promise<AppState> {
  const db = getDb();
  await ensureSchema(db);

  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id = 1")
    .first<{ payload: string }>();

  if (!row) {
    const initial = createDefaultState();
    try {
      await db
        .prepare("INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)")
        .bind(JSON.stringify(initial), initial.updatedAt)
        .run();
    } catch {
      const existing = await db
        .prepare("SELECT payload FROM app_state WHERE id = 1")
        .first<{ payload: string }>();
      if (existing) {
        return parsePayload(existing.payload);
      }
    }
    return initial;
  }

  return parsePayload(row.payload);
}

export async function setState(next: Pick<AppState, "title" | "topics">): Promise<AppState> {
  const db = getDb();
  await ensureSchema(db);

  const state: AppState = {
    title: next.title,
    topics: next.topics.map((topic, index) => ({ ...topic, order: index })),
    updatedAt: Date.now(),
  };

  await db
    .prepare(
      `INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .bind(JSON.stringify(state), state.updatedAt)
    .run();

  return state;
}

function parsePayload(payload: string): AppState {
  try {
    const parsed: unknown = JSON.parse(payload);
    const state = normalizeState(parsed);
    if (state) return state;
  } catch {
    // Fall through to a fresh seed if stored data is unreadable.
  }
  return createDefaultState();
}
