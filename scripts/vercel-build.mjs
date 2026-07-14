#!/usr/bin/env node
/**
 * Vercel 构建脚本：需要 DATABASE_URL 才能执行数据库迁移
 */
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

run("npx prisma generate");

if (!process.env.DATABASE_URL) {
  console.error("\n❌ 缺少环境变量 DATABASE_URL");
  console.error("请在 Vercel 项目 Settings → Environment Variables 中添加：");
  console.error("  - DATABASE_URL（Turso libsql:// 地址）");
  console.error("  - TURSO_AUTH_TOKEN（Turso Auth Token）");
  console.error("添加后点击 Redeploy 重新部署。\n");
  process.exit(1);
}

run("npx prisma migrate deploy");
run("npx next build");
