# Astro 博客项目

## 项目简介

这是一个基于 **本地 Markdown 文件** 的 Astro 静态博客项目，从本地读取 markdown 文件，生成静态 HTML 页面。

## 数据来源

博客文章存放在 iCloud 云盘目录：

```
/Users/acelee/Library/Mobile Documents/iCloud~com~coderforart~iOS~MWeb/Documents/blog
```

如需修改博客目录，编辑 `src/utils/posts.ts` 中的 `BLOG_DIR` 常量。

### Frontmatter 格式

```yaml
---
id: D83CF5D8-B910-4A23-80C1-18375B129F19
title: 文章标题
created: 2026-02-24T12:02:13Z
modified: 2026-02-24T12:02:13Z
tags: tag1, tag2
---

文章内容...
```

## 目录结构

```
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets/
│   │   ├── astro.svg
│   │   └── background.svg
│   ├── components/
│   │   └── Welcome.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro          # 博客首页
│   │   └── post/
│   │       └── [id].astro       # 文章详情页
│   └── utils/
│       └── posts.ts             # 文章读取工具函数
├── astro.config.mjs
└── package.json
```

## 命令

所有命令需在项目根目录下运行：

| 命令 | 说明 |
| :--- | :--- |
| `npm install` | 安装依赖 |
| `npm run dev` | 启动本地开发服务器 (`localhost:4321`) |
| `npm run build` | 构建生产环境站点到 `./dist/` 目录 |
| `npm run preview` | 本地预览构建结果 |
| `npm run deploy` | 将 `./dist/` 部署到服务器 (SSH: ta) |
| `npm run astro ...` | 运行 Astro CLI 命令，如 `astro add` |

## 部署说明

部署使用 rsync 通过 SSH 同步到服务器，服务器配置如下：

- **SSH 别名**: ta
- **服务器路径**: /root/nginx/html/

部署前需确保本地 SSH 密钥已配置到 `~/.ssh/config` 中。
