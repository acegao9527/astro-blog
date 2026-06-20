# AGENTS.md

本文件定义 Codex 在本仓库中的仓库级协作指令。

## 核心要求

- 如无必要，勿增实体。中文回复，言简意赅。

## 项目规则

- 每次代码或内容变更后，都必须运行 `npm run build`。
- 常规发布不再从 GitHub Actions 或本机 SSH 登录服务器；GitHub Actions 只验证构建，ta 服务器上的 `astro-blog-pull-deploy.timer` 主动拉取源码、在本地构建并部署。
- 构建成功后，除非用户明确要求不要这样做，否则必须立即提交并推送本次相关仓库变更。
- 以已部署的博客网址作为主要验收界面。目标是每次改动完成后，都能通过 ta 服务器定时任务在在线站点看到最新结果。

## 操作说明

- 如果 `npm run build` 失败，先修复问题，再继续提交和推送。
- 不要在常规流程里运行 `npm run deploy`；该命令会拒绝直连 SSH 部署。
- 只有紧急回滚或手动救援时才允许使用 `npm run deploy:legacy-ssh`，并且必须明确说明原因。
- 部署链路变更后，检查 ta 上的 `astro-blog-pull-deploy.service` 和 `astro-blog-pull-deploy.timer` 状态。

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
