# 博客部署方案

## 整体架构

```text
┌─────────────────────────────────────────────────────────────────┐
│                         数据源 (MWeb)                            │
│  /Users/acelee/Library/Mobile Documents/.../Documents/blog/     │
│  └── <slug>/index.md + assets                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    同步脚本 (本地)                               │
│                                                                 │
│   npm run sync:posts                                            │
│                                                                 │
│   scripts/sync-posts.mjs                                        │
│   - 读取文章目录下的 index.md                                  │
│   - 规范化 frontmatter                                          │
│   - 自动生成 description                                        │
│   - 复制文章素材到 public/uploads/posts                         │
│   - 写入 src/content/posts                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Astro 静态构建                                │
│                                                                 │
│   npm run build                                                 │
│                                                                 │
│   src/content.config.ts                                         │
│   - 定义 posts collection schema                               │
│                                                                 │
│   src/pages/                                                    │
│   - index.astro                                                 │
│   - post/[slug].astro                                           │
│   - archive/index.astro                                         │
│   - tags/index.astro                                            │
│   - tags/[tag].astro                                            │
│   - rss.xml.js                                                  │
│                                                                 │
│   输出：dist/                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     远程服务器 (SSH)                             │
│                                                                 │
│   rsync -avz --delete -e ssh dist/ ta:/root/nginx-blog/html/    │
│                                                                 │
│   Nginx 提供静态站点服务                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 关键点

### 内容系统

- 写作仍然在 MWeb / 本地 Markdown 中完成
- 构建前同步到 `src/content/posts`
- 文章素材构建前同步到 `public/uploads/posts`
- Astro collection schema 负责字段校验
- 页面渲染使用 Astro 原生 Markdown，而不是手写 `set:html`

### 页面能力

- 首页：最近文章 + 热门标签
- 文章页：SEO、标签、上一篇 / 下一篇
- 归档页：按年份聚合
- 标签页：标签总览与标签详情
- RSS：`/rss.xml`
- Sitemap：由 `@astrojs/sitemap` 生成

### 环境变量

- `BLOG_DIR`：覆盖本地 Markdown 目录
- `SITE_URL`：设置站点绝对地址，用于 canonical、RSS 和 sitemap
