import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const inputPath = process.argv[2];
const outputPath = resolve(
  process.argv[3] ?? "src/server/wordle/data/accepted-guesses.json",
);

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/generate-wordle-dictionary.mjs <SCOWL word-list output> [output path]",
  );
}

const source = (await readFile(resolve(inputPath), "utf8")).replace(
  /^\uFEFF/u,
  "",
);
const words = [
  ...new Set(
    source
      .split(/\r?\n/u)
      .filter((word) => /^[A-Za-z]{5}$/u.test(word))
      .map((word) => word.toUpperCase()),
  ),
].sort();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(words, null, 2)}\n`, "utf8");

console.log(`Generated ${words.length} accepted Wordle guesses.`);
