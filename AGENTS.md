# AGENTS.md

本文件定义 Codex 在本仓库中的仓库级协作指令。

## 核心要求

- 如无必要，勿增实体。中文回复，言简意赅。

## 项目规则

- 每次代码或内容变更后，都必须运行 `npm run build`。
- 内容同步采用发布白名单：只扫描 Oasis/Blog/已发布/ 下的四位年份目录，并继续兼容其中 `published`、`archived` 状态的正式文章；Tech、来源归档、草稿、自动草稿、选题和渠道产物 均不得进入网站构建。
- 常规网站发布由 blog 仓库的 `blog-website-publish` skill 触发：本机 blog 内容源构建成功后，显式运行 `npm run deploy` 同步到服务器。
- 代码修改构建成功后，提交并推送本次相关 Astro 仓库变更；Oasis 内容无 Git，禁止对内容源执行 Git。
- 只有用户明确授权发布或部署时才运行 direct deploy；内容迁移与构建修复使用本地构建和产物验收，不自动发布文章。

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
- Blog Dir：`/Users/acelee/workspace/oasis/Blog`
- Site URL：`https://clawasync.com`
