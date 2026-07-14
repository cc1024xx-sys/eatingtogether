# 部署到 Vercel

## 一、准备工作

代码仓库：[https://github.com/cc1024xx-sys/eatingtogether](https://github.com/cc1024xx-sys/eatingtogether)

生产环境需要 **Turso** 云数据库（Vercel 无法持久化本地 SQLite 文件）。

## 二、创建 Turso 数据库（免费）

1. 打开 [https://turso.tech](https://turso.tech) 注册并登录
2. 创建数据库，名称例如：`eatingtogether`
3. 在数据库页面获取：
   - **Database URL**（形如 `libsql://eatingtogether-xxx.turso.io`）
   - **Auth Token**（点击 Generate Token）

## 三、在 Vercel 部署

### 方式 A：网页导入（推荐）

1. 打开一键导入链接：  
   [https://vercel.com/new/import?s=https://github.com/cc1024xx-sys/eatingtogether](https://vercel.com/new/import?s=https://github.com/cc1024xx-sys/eatingtogether)
2. 使用 GitHub 账号登录并授权 Vercel
3. **先创建 Turso 数据库**（见第二节），再部署
4. 进入 **eatingtogether 项目**（不是 Team 设置）→ **Settings → Environment Variables**，添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `libsql://xxx.turso.io` | Turso 数据库地址 |
| `TURSO_AUTH_TOKEN` | `eyJ...` | Turso Auth Token |

5. **Environments** 勾选：Production、Preview、Development
6. **Link to Projects** 选择 `eatingtogether`
7. 保存后 → **Deployments** → **Redeploy**

> ⚠️ 若未配置 `DATABASE_URL` 就部署，构建会失败并提示：`The datasource.url property is required`

### 方式 B：命令行部署

```bash
cd /Users/cc_home/Documents/vibecoding/eatingtogether2.0
npx vercel login          # 浏览器完成登录
npx vercel link           # 关联项目
npx vercel env add DATABASE_URL production
npx vercel env add TURSO_AUTH_TOKEN production
npx vercel --prod
```

## 四、部署成功后

Vercel 会分配公开链接，形如：

`https://eatingtogether-xxx.vercel.app`

每次推送到 `main` 分支会自动重新部署（若已关联 GitHub）。

## 五、常见问题

- **构建失败**：检查 `DATABASE_URL` 和 `TURSO_AUTH_TOKEN` 是否已配置
- **页面打开但数据加载失败**：确认 Turso 数据库已创建，并重新 Deploy
- **本地开发**：使用 `npm run dev`，数据库为本地 `dev.db`，无需 Turso
