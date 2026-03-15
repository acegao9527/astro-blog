# Astro 博客项目

## 项目简介

这是一个基于 **Craft CMS API** 的 Astro 静态博客项目，通过调用 Craft CMS 的 API 获取文章数据，生成静态页面。

## 数据来源

博客内容来自 Craft CMS，需要配置以下环境变量：

| 环境变量 | 说明 |
| :--- | :--- |
| `CRAFT_API_URL` | Craft CMS API 地址 |
| `CRAFT_API_TOKEN` | Craft CMS 访问令牌 |
| `CRAFT_COLLECTION_ID` | 文章集合 ID |

## 目录结构

```
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
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
