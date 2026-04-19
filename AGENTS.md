# AGENTS.md

This file defines repository-level instructions for Codex working in this project.

## Project Rules

- After every code or content change, run `npm run build`.
- If the build succeeds, immediately run `npm run deploy`.
- Treat the deployed blog URL as the primary review surface. The goal is that the latest change is visible at the live site right after the change is finished.

## Operational Notes

- Do not skip deploy after a successful build, even for small UI or content changes.
- If `npm run build` fails, fix the issue before attempting `npm run deploy`.
- If `npm run deploy` fails, report the failure clearly and include the reason.
