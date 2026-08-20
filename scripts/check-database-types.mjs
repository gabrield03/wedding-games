import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { format } from "prettier";

const require = createRequire(import.meta.url);
const supabaseCliPath = require.resolve("supabase/dist/supabase.js");
const databaseTypesPath = new URL(
  "../src/types/database.generated.ts",
  import.meta.url,
);

const generatedTypes = spawnSync(
  process.execPath,
  [
    supabaseCliPath,
    "gen",
    "types",
    "typescript",
    "--local",
    "--schema",
    "public",
  ],
  { encoding: "utf8" },
);

if (generatedTypes.error) {
  console.error("Unable to generate database types from local Supabase.");
  console.error(generatedTypes.error.message);
  process.exit(1);
}

if (generatedTypes.status !== 0) {
  process.stderr.write(generatedTypes.stderr);
  process.exit(generatedTypes.status ?? 1);
}

const normalizeLineEndings = (value) => value.replace(/\r\n?/g, "\n");
const formattedGeneratedTypes = await format(generatedTypes.stdout, {
  endOfLine: "lf",
  parser: "typescript",
});
const committedTypes = await readFile(databaseTypesPath, "utf8");

if (
  normalizeLineEndings(formattedGeneratedTypes) !==
  normalizeLineEndings(committedTypes)
) {
  console.error(
    "Database types are stale. Run npm run db:types and commit the updated file.",
  );
  process.exit(1);
}

console.log("Database types match the local public schema.");
