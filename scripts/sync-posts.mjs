import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_BLOG_DIR =
  "/Users/acelee/Library/Mobile Documents/iCloud~md~obsidian/Documents/ClawDoc/blog";
const BLOG_DIR = process.env.BLOG_DIR || DEFAULT_BLOG_DIR;
const OUTPUT_DIR = path.join(ROOT_DIR, "src", "content", "posts");

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function cleanOutputDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith(".md") || entry.endsWith(".mdx")) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .trim()
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((tag) => tag.trim())
      .map((tag) => tag.replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return [];
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const frontmatter = match[1];
  const data = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    data[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return {
    data,
    content: raw.slice(match[0].length),
  };
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeExcerpt(body) {
  const plain = stripMarkdown(body);
  return plain.slice(0, 140).trim();
}

function escapeYamlString(value) {
  return JSON.stringify(value ?? "");
}

function frontmatterToString(data) {
  const lines = [
    "---",
    `title: ${escapeYamlString(data.title)}`,
    `slug: ${escapeYamlString(data.slug)}`,
    `created: ${escapeYamlString(data.created)}`,
    `modified: ${escapeYamlString(data.modified)}`,
    `description: ${escapeYamlString(data.description)}`,
  ];

  if (data.id) {
    lines.push(`id: ${escapeYamlString(data.id)}`);
  }

  lines.push(
    `tags: [${data.tags.map((tag) => escapeYamlString(tag)).join(", ")}]`,
  );
  lines.push("---", "");
  return lines.join("\n");
}

if (!fs.existsSync(BLOG_DIR)) {
  console.error(`[sync-posts] Blog directory not found: ${BLOG_DIR}`);
  process.exit(1);
}

ensureDirectory(OUTPUT_DIR);
cleanOutputDir(OUTPUT_DIR);

const files = fs
  .readdirSync(BLOG_DIR)
  .filter((file) => file.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b, "zh-CN"));

let count = 0;

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = parseFrontmatter(raw);

  const basename = path.basename(file, path.extname(file));
  const slug = String(data.slug || basename).trim();
  const created = String(
    data.created || data.modified || new Date().toISOString(),
  );
  const modified = String(data.modified || data.created || created);
  const title = String(data.title || basename).trim();
  const description = String(data.description || makeExcerpt(content)).trim();
  const tags = normalizeTags(data.tags);

  const normalized = {
    id: data.id ? String(data.id).trim() : undefined,
    title,
    slug,
    created,
    modified,
    description,
    tags,
  };

  const output = `${frontmatterToString(normalized)}${content.trim()}\n`;
  fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.md`), output, "utf-8");
  count += 1;
}

console.log(`[sync-posts] Synced ${count} post(s) from ${BLOG_DIR}`);
