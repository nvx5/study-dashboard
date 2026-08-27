import curriculumText from "../../curriculum.txt?raw";

export const CURRICULUM_FILENAME = "curriculum.txt";
export const CURRICULUM_TEXT = curriculumText.replace(/\r\n/g, "\n");

export type CurriculumCategory = {
  name: string;
  topics: string[];
};

export function parseCurriculum(text: string): CurriculumCategory[] {
  const categories: CurriculumCategory[] = [];
  let current: CurriculumCategory | null = null;

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.startsWith("# ")) {
      const name = line.slice(2).trim();
      current = { name, topics: [] };
      if (name) categories.push(current);
      continue;
    }

    if (!current) continue;
    current.topics.push(line.replace(/^[-*]\s+/, ""));
  }

  return categories.filter((category) => category.name && category.topics.length > 0);
}

export function lineCount(text: string): number {
  return text.replace(/\n$/, "").split("\n").length;
}
