#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> BC厨房 Vercel 部署脚本"
echo ""

if ! command -v npx >/dev/null 2>&1; then
  echo "错误: 需要 Node.js 和 npm"
  exit 1
fi

# 方式 1: 使用 Token（推荐，适合 CLI / CI）
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "检测到 VERCEL_TOKEN，开始部署..."
  npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
  echo ""
  echo "部署完成。访问 Vercel Dashboard 查看公开链接。"
  exit 0
fi

# 方式 2: 交互式登录
echo "未检测到 VERCEL_TOKEN。"
echo ""
echo "请先完成以下任一方式："
echo ""
echo "【A】网页部署（推荐）"
echo "  1. 安装 GitHub 集成: https://github.com/apps/vercel"
echo "  2. 导入项目: https://vercel.com/new/import?s=https://github.com/cc1024xx-sys/eatingtogether"
echo "  3. 在 Vercel 添加环境变量:"
echo "     DATABASE_URL      = Turso libsql:// 地址"
echo "     TURSO_AUTH_TOKEN  = Turso Auth Token"
echo "  4. Redeploy"
echo ""
echo "【B】命令行部署"
echo "  1. 在 https://vercel.com/account/tokens 创建 Token"
echo "  2. 运行:"
echo "     export VERCEL_TOKEN=你的token"
echo "     ./scripts/deploy-vercel.sh"
echo ""
echo "  或:"
echo "     npx vercel login"
echo "     npx vercel --prod"
echo ""

read -r -p "是否现在尝试 vercel login？(y/N) " ans
if [[ "${ans,,}" == "y" ]]; then
  npx vercel@latest login
  echo ""
  read -r -p "请输入 Turso DATABASE_URL (libsql://...): " db_url
  read -r -p "请输入 TURSO_AUTH_TOKEN: " db_token
  npx vercel@latest env add DATABASE_URL production <<< "$db_url" || true
  npx vercel@latest env add TURSO_AUTH_TOKEN production <<< "$db_token" || true
  npx vercel@latest --prod
else
  echo "已取消。请使用上方【A】网页部署。"
fi
