# Astro 博客项目

这是一个基于 Astro 6 的静态个人博客。文章来自 Git 仓库或本地 Markdown 目录，构建前会先同步到根目录的 `.cache/content/posts`，文章素材会同步到 `public/uploads/posts`，再由 Astro content collections 统一校验、渲染和生成页面。

## 已完成的优化

- 内容链路改为 `sync -> content collections -> static build`
- 统一 `Layout` 和全局样式
- 文章页改用 Astro 原生 Markdown 渲染
- 增加 SEO、canonical、Open Graph、JSON-LD
- 增加 `sitemap`、`robots.txt` 和 RSS
- 增加标签页、标签详情页、文章归档页
- 增加文章页上一篇 / 下一篇导航

## 内容来源

项目不再内置任何机器相关的默认路径。运行前需要显式提供内容源和站点地址：

- `BLOG_REPO_URL`：Markdown 源仓库地址，设置后优先使用
- `BLOG_REPO_REF`：可选，指定分支或 tag；不设置时使用仓库默认分支
- `BLOG_REPO_SHA`：可选，指定需要构建的精确 commit；ta 服务器部署脚本会用它锁定 blog 源码版本
- `BLOG_DIR`：可选，本地 Markdown 源目录的绝对路径；仅在未设置 `BLOG_REPO_URL` 时使用
- `SITE_URL`：线上站点绝对地址，用于 canonical、RSS、sitemap 和分享元信息

推荐先复制一份环境变量文件：

```bash
cp .env.example .env
```

然后在 `.env` 中填写真实值：

```bash
BLOG_REPO_URL="git@github.com:acegao9527/blog.git"
SITE_URL="https://your-blog.com"
```

也可以在命令前临时覆盖：

```bash
BLOG_REPO_URL="git@github.com:acegao9527/blog.git" npm run dev
```

```bash
SITE_URL="https://your-blog.com" npm run build
```

说明：

- `npm run sync:posts` 和 `npm run build` 都会校验必需配置
- 缺少内容源或 `SITE_URL` 时会直接失败，不再回退到隐式默认值
- 使用 `BLOG_REPO_URL` 时，仓库会缓存到 `.cache/source/blog`
- shell 环境变量优先级高于 `.env`
- ta 服务器的 pull-deploy 变量也放在 `.env` 中，示例见 `.env.example` 的 `ASTRO_BLOG_*` 部分

## 数据源结构

推荐的源目录结构：

```text
BLOG_REPO_URL 或 BLOG_DIR 指向的根目录/
  hermes-vs-openclaw/
    index.md
    cover.webp
    compare-chart.png
  openclaw-bu-shu-bi-kang-zhi-nan/
    index.md
    cover.webp
    install-step-1.png
```

约定：

- 每篇文章一个目录，目录名建议直接等于 `slug`
- 正文文件固定为 `index.md`
- 图片、PDF 等素材和文章放在同目录或其子目录
- Markdown 中使用相对路径，例如 `![](./cover.webp)` 或 `[附件](./files/guide.pdf)`
- 同步后素材会被复制到 `public/uploads/posts/<slug>/`

## Frontmatter

支持的 frontmatter 字段：

```yaml
---
id: D83CF5D8-B910-4A23-80C1-18375B129F19
title: 文章标题
slug: article-slug
created: 2026-02-24T12:02:13Z
modified: 2026-02-24T12:02:13Z
tags: tag1, tag2
description: 可选摘要
cover: ./cover.webp
---
```

说明：

- `tags` 可以是 `tag1, tag2` 或 YAML 数组
- `description` 留空时会从正文自动截取摘要
- `cover` 等相对素材路径会在同步时改写为站点路径
- 同步脚本会把源 Markdown 规范化写入 `.cache/content/posts`
- 正文中的相对素材链接会同步到 `public/uploads/posts/<slug>/`

## 命令

| 命令 | 说明 |
| :--- | :--- |
| `npm install` | 安装依赖 |
| `npm run sync:posts` | 手动同步 Markdown 内容源到 `.cache/content/posts` |
| `npm run dev` | 先同步文章，再启动本地开发服务器 |
| `npm run build` | 先同步文章，再构建生产站点到 `./dist/` |
| `npm run preview` | 本地预览构建结果 |
| `npm run check` | 运行 Astro 类型检查 |
| `npm run deploy` | 拒绝直连 SSH 部署，并提示使用 pull-deploy 链路 |
| `npm run deploy:legacy-ssh` | 紧急情况下使用旧 SSH/rsync 方式部署 `./dist/` |

## 目录结构

```text
/
├── public/
│   ├── favicon.svg
│   ├── favicon.ico
│   ├── uploads/
│   │   └── posts/            # 同步生成的文章素材
│   └── robots.txt
├── .cache/
│   └── content/
│       └── posts/            # 同步生成的中间 Markdown 内容
├── scripts/
│   ├── config.mjs
│   └── sync-posts.mjs
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── blog.ts
│   ├── pages/
│   │   ├── archive/index.astro
│   │   ├── index.astro
│   │   ├── post/[slug].astro
│   │   ├── rss.xml.js
│   │   └── tags/
│   ├── styles/
│   │   └── global.css
│   └── content.config.ts
├── astro.config.mjs
├── .env.example
└── package.json
```

## 部署

常规部署链路：

```text
blog push -> ta Hermes cron -> local build and deploy
```

GitHub Actions 已退出常规部署链路。ta 服务器上的 Hermes cron job `astro-blog deploy watcher` 每 5 分钟主动拉取 `astro-blog` 和 `blog` 两个仓库的增量，在服务器本地构建，再把 `dist/` 同步到 `/home/ubuntu/nginx-blog/html/`。无变化时 Hermes 不唤醒 agent；有新部署或失败时会发飞书通知。

部署运维说明见 `docs/pull-deploy.md`。
