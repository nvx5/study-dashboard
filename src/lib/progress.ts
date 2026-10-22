import type { Category } from "./types";

export function categoryProgress(category: Pick<Category, "topics">): {
  done: number;
  total: number;
  percent: number;
  label: string;
} {
  const total = category.topics.length;
  const done = category.topics.filter((topic) => topic.confidence === "green").length;
  const percent = total === 0 ? 0 : Math.round((done * 100) / total);
  return {
    done,
    total,
    percent,
    label: `${done}/${total} (${percent}%)`,
  };
}
