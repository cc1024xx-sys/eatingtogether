#!/usr/bin/env node
/**
 * 将 Prisma 迁移 SQL 应用到 Turso（libsql://）。
 * Prisma Migrate 不支持远程 libSQL，需在构建时通过 @libsql/client 执行。
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "";
const authToken = process.env.TURSO_AUTH_TOKEN ?? "";

if (!url.startsWith("libsql:")) {
  console.log("跳过 Turso 迁移：DATABASE_URL 不是 libsql://");
  process.exit(0);
}

if (!authToken) {
  console.error("\n❌ Turso 迁移需要 TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });
const migrationsDir = path.join(process.cwd(), "prisma/migrations");

const migrationDirs = fs
  .readdirSync(migrationsDir)
  .filter((entry) => {
    const fullPath = path.join(migrationsDir, entry);
    return entry !== "migration_lock.toml" && fs.statSync(fullPath).isDirectory();
  })
  .sort();

async function tableExists(name) {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return result.rows.length > 0;
}

async function main() {
  if (await tableExists("Ingredient")) {
    console.log("> Turso 数据库已存在表结构，跳过迁移");
    return;
  }

  for (const migration of migrationDirs) {
    const sqlPath = path.join(migrationsDir, migration, "migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log(`> 应用 Turso 迁移: ${migration}`);
    await client.executeMultiple(sql);
  }

  console.log("> Turso 迁移完成");
}

main().catch((error) => {
  console.error("\n❌ Turso 迁移失败:", error.message);
  process.exit(1);
});
