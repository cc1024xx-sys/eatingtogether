#!/usr/bin/env bash
# 在 macOS 上打开 Vercel 部署所需的网页
open "https://github.com/apps/vercel"
sleep 1
open "https://vercel.com/account/integrations"
sleep 1
open "https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2Fcc1024xx-sys%2Featingtogether"

echo "已在浏览器打开："
echo "  1. GitHub Vercel 应用安装页"
echo "  2. Vercel Integrations 设置"
echo "  3. 项目导入页"
echo ""
echo "请依次完成 GitHub 授权 → 选择 eatingtogether 仓库 → Deploy"
echo "然后在 Vercel 添加 Turso 环境变量后 Redeploy。"
