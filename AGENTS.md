# AGENTS.md

本文件定义 Codex 在本仓库中的仓库级协作指令。

## 核心要求

- 如无必要，勿增实体。

## 项目规则

- 每次代码或内容变更后，都必须运行 `npm run build`。
- 如果构建成功，必须立即运行 `npm run deploy`。
- `npm run deploy` 成功后，除非用户明确要求不要这样做，否则必须立即提交并推送本次相关仓库变更。
- 以已部署的博客网址作为主要验收界面。目标是每次改动完成后，都能立刻在在线站点看到最新结果。

## 操作说明

- 即使只是很小的 UI 或内容改动，构建成功后也不要跳过部署。
- 如果 `npm run build` 失败，先修复问题，再尝试 `npm run deploy`。
- 如果 `npm run deploy` 失败，要明确说明失败原因。

## 项目标识

当用户在自然语言中提到本项目时，默认将以下名称视为本仓库别名：

- 博客项目
- astro-blog
- clawasync 博客
- 博客仓库
- 博客站点

项目锚点：

- Repo：`/Users/acelee/workspace/astro-blog`
- Blog Dir：`/Users/acelee/Library/Mobile Documents/iCloud~md~obsidian/Documents/ClawDoc/blog`
- Site URL：`https://clawasync.com`
