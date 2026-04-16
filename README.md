# Astro 博客项目

这是一个基于 Astro 6 的静态个人博客。文章依然来自本地 Markdown，但在构建前会先同步到 `src/content/posts`，再由 Astro content collections 统一校验、渲染和生成页面。

## 已完成的优化

- 内容链路改为 `sync -> content collections -> static build`
- 统一 `Layout` 和全局样式
- 文章页改用 Astro 原生 Markdown 渲染
- 增加 SEO、canonical、Open Graph、JSON-LD
- 增加 `sitemap`、`robots.txt` 和 RSS
- 增加标签页、标签详情页、文章归档页
- 增加文章页上一篇 / 下一篇导航

## 内容来源

默认博客目录：

```bash
/Users/acelee/Library/Mobile Documents/iCloud~com~coderforart~iOS~MWeb/Documents/blog
```

可通过环境变量覆盖：

```bash
BLOG_DIR="/your/blog/dir" npm run dev
```

构建站点的绝对地址也建议显式配置：

```bash
SITE_URL="https://your-blog.com" npm run build
```

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
---
```

说明：

- `tags` 可以是 `tag1, tag2` 或 YAML 数组
- `description` 留空时会从正文自动截取摘要
- 同步脚本会把源 Markdown 规范化写入 `src/content/posts`

## 命令

| 命令 | 说明 |
| :--- | :--- |
| `npm install` | 安装依赖 |
| `npm run sync:posts` | 手动同步本地 Markdown 到 `src/content/posts` |
| `npm run dev` | 先同步文章，再启动本地开发服务器 |
| `npm run build` | 先同步文章，再构建生产站点到 `./dist/` |
| `npm run preview` | 本地预览构建结果 |
| `npm run check` | 运行 Astro 类型检查 |
| `npm run deploy` | 将 `./dist/` 部署到服务器 |

## 目录结构

```text
/
├── public/
│   ├── favicon.svg
│   ├── favicon.ico
│   └── robots.txt
├── scripts/
│   └── sync-posts.mjs
├── src/
│   ├── content/
│   │   └── posts/             # 同步生成的标准 Markdown 内容
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
└── package.json
```

## 部署

当前部署脚本：

```bash
npm run deploy
```

实际同步目标：

- SSH 别名：`ta`
- 服务器路径：`/root/nginx-blog/html/`

部署前确保：

- `SITE_URL` 已设置为线上域名
- 服务器静态目录与 `package.json` 中的 `deploy` 脚本一致
- 本地 SSH 配置已可直接连接 `ta`
