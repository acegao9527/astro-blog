import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT_DIR, ".env");

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  const quote = trimmed[0];
  if ((quote === `"` || quote === `'`) && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  const commentIndex = trimmed.search(/\s+#/);
  if (commentIndex === -1) {
    return trimmed;
  }

  return trimmed.slice(0, commentIndex).trim();
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex === -1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!key) continue;

    const value = normalized.slice(separatorIndex + 1);
    env[key] = parseEnvValue(value);
  }

  return env;
}

const fileEnv = loadEnvFile();

function readConfigValue(key) {
  const processValue = process.env[key];
  if (typeof processValue === "string" && processValue.trim()) {
    return processValue.trim();
  }

  const fileValue = fileEnv[key];
  if (typeof fileValue === "string" && fileValue.trim()) {
    return fileValue.trim();
  }

  return undefined;
}

export function getProjectConfig() {
  return {
    rootDir: ROOT_DIR,
    blogDir: readConfigValue("BLOG_DIR"),
    siteUrl: readConfigValue("SITE_URL"),
  };
}

export function requireConfigValue(key, value, context) {
  if (value) {
    return value;
  }

  throw new Error(
    `[config] Missing ${key} for ${context}. Set it in the shell environment or in ${path.relative(
      ROOT_DIR,
      ENV_FILE,
    )}.`,
  );
}
