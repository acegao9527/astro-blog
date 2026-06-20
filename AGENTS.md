# AGENTS.md

本文件定义 Codex 在本仓库中的仓库级协作指令。

## 核心要求

- 如无必要，勿增实体。中文回复，言简意赅。

## 项目规则

- 每次代码或内容变更后，都必须运行 `npm run build`。
- 常规网站发布由 blog 仓库的 `blog-website-publish` skill 触发：本机 blog 内容源构建成功后，显式运行 `npm run deploy` 同步到服务器。
- 构建成功后，除非用户明确要求不要这样做，否则必须立即提交并推送本次相关仓库变更。
- 以已部署的博客网址作为主要验收界面。目标是每次改动完成后，都能通过 direct deploy 在在线站点看到最新结果。

## 操作说明

- 如果 `npm run build` 失败，先修复问题，再继续提交和推送。
- 常规流程允许在构建成功后用 `DEPLOY_ENABLE_DIRECT=1 npm run deploy` 做显式直连部署。
- 只有兼容旧流程时才使用 `npm run deploy:legacy-ssh`。
- 部署链路变更后，确认 ta 上不再存在 Hermes cron job `astro-blog deploy watcher`。

## 项目标识

当用户在自然语言中提到本项目时，默认将以下名称视为本仓库别名：

- 博客项目
- astro-blog
- clawasync 博客
- 博客仓库
- 博客站点

项目锚点：

- Repo：`/Users/acelee/workspace/astro-blog`
- Blog Dir：`/Users/acelee/workspace/blog`
- Site URL：`https://clawasync.com`
