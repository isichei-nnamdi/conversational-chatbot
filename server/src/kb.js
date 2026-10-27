import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const KB_PATH = path.resolve(here, "../data/kb.json");

export function loadKb(file = KB_PATH) {
  return JSON.parse(readFileSync(file, "utf8"));
}
