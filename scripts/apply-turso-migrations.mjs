#!/usr/bin/env node
/**
 * 将 Prisma 迁移 SQL 应用到 Turso（libsql://）。
 * Prisma Migrate 不支持远程 libSQL，需在构建时通过 @libsql/client 执行。
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

function rowValue(row, key, index = 0) {
  if (row && typeof row === "object" && key in row) {
    return row[key];
  }
  return Array.isArray(row) ? row[index] : undefined;
}

async function tableExists(name) {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return result.rows.length > 0;
}

async function columnExists(table, column) {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => rowValue(row, "name", 1) === column);
}

async function indexExists(name) {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?",
    args: [name],
  });
  return result.rows.length > 0;
}

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "migration_name" TEXT NOT NULL UNIQUE,
      "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function isMigrationApplied(name) {
  const result = await client.execute({
    sql: 'SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ?',
    args: [name],
  });
  return result.rows.length > 0;
}

async function markMigrationApplied(name) {
  await client.execute({
    sql: 'INSERT OR IGNORE INTO "_prisma_migrations" ("id", "migration_name") VALUES (?, ?)',
    args: [randomUUID(), name],
  });
}

async function bootstrapLegacyMigrationState() {
  const countResult = await client.execute(
    'SELECT COUNT(*) AS count FROM "_prisma_migrations"'
  );
  const existingCount = Number(rowValue(countResult.rows[0], "count", 0) ?? 0);
  if (existingCount > 0) return;

  if (!(await tableExists("Ingredient"))) return;

  console.log("> 检测到旧版 Turso 数据库，推断已应用的迁移");

  const inferred = ["20260714041406_init"];

  if (await columnExists("Recipe", "category")) {
    inferred.push("20260714171600_add_recipe_category");
  }
  if (await columnExists("Recipe", "favorite")) {
    inferred.push("20260714172300_add_recipe_favorite");
  }
  if (!(await indexExists("MealPlanItem_date_mealType_key"))) {
    inferred.push("20260714173000_meal_plan_multi_recipe");
  }

  for (const migration of inferred) {
    await markMigrationApplied(migration);
    console.log(`  · 已标记: ${migration}`);
  }
}

async function main() {
  await ensureMigrationsTable();
  await bootstrapLegacyMigrationState();

  for (const migration of migrationDirs) {
    if (await isMigrationApplied(migration)) {
      console.log(`> 跳过已应用迁移: ${migration}`);
      continue;
    }

    const sqlPath = path.join(migrationsDir, migration, "migration.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log(`> 应用 Turso 迁移: ${migration}`);
    await client.executeMultiple(sql);
    await markMigrationApplied(migration);
  }

  console.log("> Turso 迁移完成");
}

main().catch((error) => {
  console.error("\n❌ Turso 迁移失败:", error.message);
  process.exit(1);
});
