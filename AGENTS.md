# AGENTS.md

This file defines repository-level instructions for Codex working in this project.

## Project Rules

- After every code or content change, run `npm run build`.
- If the build succeeds, immediately run `npm run deploy`.
- After `npm run deploy` succeeds, immediately commit and push the related repository changes unless the user explicitly asks not to.
- Treat the deployed blog URL as the primary review surface. The goal is that the latest change is visible at the live site right after the change is finished.

## Operational Notes

- Do not skip deploy after a successful build, even for small UI or content changes.
- If `npm run build` fails, fix the issue before attempting `npm run deploy`.
- If `npm run deploy` fails, report the failure clearly and include the reason.

## Project Identity

When the user refers to this project in natural language, treat the following names as aliases for this repository by default:

- 博客项目
- astro-blog
- clawasync 博客
- 博客仓库
- 博客站点

Project anchors:

- Repo: `/Users/acelee/workspace/astro-blog`
- Blog Dir: `/Users/acelee/Library/Mobile Documents/iCloud~md~obsidian/Documents/ClawDoc/blog`
- Site URL: `https://clawasync.com`
