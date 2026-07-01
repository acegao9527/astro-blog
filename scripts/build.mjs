import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT_DIR,
  getProjectConfig,
  requireConfigValue,
  requireContentSourceConfig,
} from "./config.mjs";

const CACHE_DIRS = [
  path.join(ROOT_DIR, ".cache", "content", "posts"),
  path.join(ROOT_DIR, ".cache", "content", "about"),
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: process.env,
  });

  if (typeof result.status === "number") {
    return result.status;
  }

  return 1;
}

const config = getProjectConfig();
requireContentSourceConfig(config, "content sync");
requireConfigValue("SITE_URL", config.siteUrl, "production build");

const syncCode = run("npm", ["run", "sync:posts"]);
if (syncCode !== 0) {
  process.exit(syncCode);
}

let exitCode = 0;
try {
  exitCode = run("npm", ["run", "astro", "--", "build"]);
} finally {
  for (const cacheDir of CACHE_DIRS) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
}

process.exit(exitCode);
