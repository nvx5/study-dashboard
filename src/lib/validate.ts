import {
  CONFIDENCE,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TOPICS,
  type AppState,
  type Confidence,
  type Topic,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && (CONFIDENCE as readonly string[]).includes(value);
}

export function parseIncomingState(body: unknown): Pick<AppState, "title" | "topics"> {
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

  if (!Array.isArray(body.topics)) {
    throw new Error("topics must be an array");
  }
  if (body.topics.length > MAX_TOPICS) {
    throw new Error(`At most ${MAX_TOPICS} topics are allowed`);
  }

  const seen = new Set<string>();
  const topics: Topic[] = body.topics.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Topic ${index + 1} is invalid`);
    }

    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id || id.length > 64) {
      throw new Error(`Topic ${index + 1} is missing a valid id`);
    }
    if (seen.has(id)) {
      throw new Error("Topic ids must be unique");
    }
    seen.add(id);

    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      throw new Error(`Topic ${index + 1} needs a name`);
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`Topic names must be ${MAX_NAME_LENGTH} characters or fewer`);
    }

    if (!isConfidence(item.confidence)) {
      throw new Error(`Topic ${index + 1} has an invalid confidence value`);
    }

    return {
      id,
      name,
      confidence: item.confidence,
      order: index,
    };
  });

  return { title, topics };
}

export function normalizeState(value: unknown): AppState | null {
  try {
    const parsed = parseIncomingState(value);
    const updatedAt =
      isRecord(value) && typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now();
    return { ...parsed, updatedAt };
  } catch {
    return null;
  }
}
