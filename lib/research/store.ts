import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { researchedSupplierSchema, type ResearchedSupplier } from "./contract.ts";

/** Tracked in git, so researched companies are there for the whole team and the jury. */
const DIRECTORY = path.join(process.cwd(), "data", "research");

/** All researched companies; an invalid file is skipped rather than breaking every page. */
export async function listResearched(): Promise<ResearchedSupplier[]> {
  const files = await readdir(DIRECTORY).catch(() => [] as string[]);
  const loaded = await Promise.all(
    files
      .filter((file) => file.startsWith("EXT_") && file.endsWith(".json"))
      .map(async (file) => {
        const parsed = researchedSupplierSchema.safeParse(JSON.parse(await readFile(path.join(DIRECTORY, file), "utf8")));
        if (!parsed.success) console.error(`Skipping invalid research file ${file}: ${parsed.error.issues[0]?.message}`);
        return parsed.success ? parsed.data : null;
      }),
  );
  return loaded.filter((supplier) => supplier !== null).sort((a, b) => a.name.localeCompare(b.name));
}

export async function findResearched(id: string): Promise<ResearchedSupplier | null> {
  return (await listResearched()).find((supplier) => supplier.id === id) ?? null;
}

/** Saves a finished research run; researching the same company again replaces the old result. */
export async function saveResearched(supplier: ResearchedSupplier): Promise<void> {
  const valid = researchedSupplierSchema.parse(supplier);
  await mkdir(DIRECTORY, { recursive: true });
  await writeFile(path.join(DIRECTORY, `${valid.id}.json`), `${JSON.stringify(valid, null, 2)}\n`, "utf8");
}
