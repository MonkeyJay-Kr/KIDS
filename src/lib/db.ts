import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const dataDir = path.join(process.cwd(), ".data", "chalcak-pg");
  await mkdir(dataDir, { recursive: true });
  const db = new PGlite(dataDir);
  await db.waitReady;

  await db.exec(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const doneRows = await db.query<{ name: string }>(
    "select name from schema_migrations",
  );
  const done = new Set(doneRows.rows.map((r) => r.name));
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
  }
  return db;
}
