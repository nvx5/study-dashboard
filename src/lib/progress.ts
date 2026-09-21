import { topicConfidence, type PersonId } from "./people";
import type { Category } from "./types";

export function categoryProgress(
  category: Pick<Category, "topics">,
  person: PersonId = "nil",
): {
  done: number;
  total: number;
  percent: number;
  label: string;
} {
  const total = category.topics.length;
  const done = category.topics.filter((topic) => topicConfidence(topic, person) === "green").length;
  const percent = total === 0 ? 0 : Math.round((done * 100) / total);
  return {
    done,
    total,
    percent,
    label: `${done}/${total} (${percent}%)`,
  };
}

export function categoryPairProgress(category: Pick<Category, "topics">): {
  nil: ReturnType<typeof categoryProgress>;
  jasmine: ReturnType<typeof categoryProgress>;
  label: string;
} {
  const nil = categoryProgress(category, "nil");
  const jasmine = categoryProgress(category, "jasmine");
  return {
    nil,
    jasmine,
    label: `${nil.done}/${nil.total} · ${jasmine.done}/${jasmine.total}`,
  };
}
