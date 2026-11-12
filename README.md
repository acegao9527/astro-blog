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
- 增加 Giscus 评论模块，评论数据存放在公开 GitHub Discussions 仓库

## 内容来源

内容唯一可编辑源为无 Git 的 Oasis。Astro 代码项目仍独立使用 Git；构建只读取 `Blog/` 中的四位年份目录和 `Blog/index.md`，保留 published、archived 两种正式文章状态。草稿、研究和来源快照不进入构建。

复制 `.env.example` 为 `.env` 后设置：

```dotenv
BLOG_SOURCE=directory
BLOG_DIR=../oasis/Blog
SITE_URL=https://clawasync.com
```

BLOG_DIR 相对于 Astro 项目根解析，也可以使用绝对路径。shell 环境变量优先于 `.env`。`npm run build` 执行内容同步与 Astro 构建；不读取 Oasis Git、不拉取旧 blog 仓库，也不部署。

```text
Oasis/Blog/
  2026/文章.md
  草稿/文章.md
  index.md
  assets/博客迁入/文章名/配图.png
  assets/发布产物/渠道/
```

文章图片使用文档相对路径，例如 `../assets/博客迁入/文章名/配图.png`。构建只允许复制 Blog/assets 内的实际文件，拒绝通过相对路径或符号链接读出其他私人领域附件。稳定 slug 控制公开 URL，目录改变不改变 URL。

发布网站与各渠道工具在 Oasis 根 `.agents/skills/`，从 Oasis 根运行。只有明确授权发布时，才运行发布技能和 direct deploy。旧仓库 pull-deploy 仅为退役恢复材料，不是当前发布入口。

执行 `npm test` 验证内容选择边界、私有附件隔离和实际新目录构建，再执行 `npm run build`。

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
| `npm run deploy` | 显式设置 `DEPLOY_ENABLE_DIRECT=1` 后，将 `./dist/` 直连同步到服务器 |
| `npm run deploy:legacy-ssh` | 紧急情况下使用旧 SSH/rsync 方式部署 `./dist/` |

## 目录结构

```text
/
├── docs/
│   ├── 博客部署方案.md
│   ├── 博客架构设计图.png
│   ├── 路线图.md
│   └── ...
├── public/
│   ├── logo.png
│   ├── favicon.ico
│   ├── apple-touch-icon.png
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

## 项目文档

项目资料、需求路线图和设计图统一放在 `docs/`：

- [博客部署方案](docs/博客部署方案.md)
- [路线图](docs/路线图.md)
- [博客架构设计图](docs/博客架构设计图.png)
- [旧服务端拉取部署说明](docs/旧服务端拉取部署说明.md)

## 部署

常规部署链路：

```text
blog-website-publish skill -> local build from /Users/acelee/workspace/blog -> direct deploy
```

GitHub Actions 和 ta 服务器上的 Hermes cron job 已退出常规部署链路。发布网站文章时，由 blog 仓库的 `blog-website-publish` skill 将文章状态改为 `published`，使用 `BLOG_SOURCE=directory BLOG_DIR=/Users/acelee/workspace/blog` 在本机构建，再用 `DEPLOY_ENABLE_DIRECT=1 npm run deploy` 将 `dist/` 同步到 `/home/ubuntu/nginx-blog/html/`。

旧服务端拉取部署运维说明见 [docs/旧服务端拉取部署说明.md](docs/旧服务端拉取部署说明.md)。
