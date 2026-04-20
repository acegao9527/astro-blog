import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ROOT_DIR, getProjectConfig, requireConfigValue } from "./config.mjs";

const { blogDir: configuredBlogDir } = getProjectConfig();
const BLOG_DIR = requireConfigValue(
  "BLOG_DIR",
  configuredBlogDir,
  "content sync",
);
const OUTPUT_DIR = path.join(ROOT_DIR, ".cache", "content", "posts");
const OUTPUT_ASSET_DIR = path.join(ROOT_DIR, "public", "uploads", "posts");
const FRONTMATTER_ASSET_FIELDS = ["cover", "hero", "image", "ogImage"];
const FILE_MODE = 0o644;
const DIRECTORY_MODE = 0o755;

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  fs.chmodSync(dir, DIRECTORY_MODE);
}

function resetOutputDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  fs.chmodSync(dir, DIRECTORY_MODE);
}

function ensureFileMode(filePath) {
  fs.chmodSync(filePath, FILE_MODE);
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

function stringifyFrontmatterValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyFrontmatterValue(item)).join(", ")}]`;
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return JSON.stringify(value);
  }

  return JSON.stringify(value ?? "");
}

function frontmatterToString(data) {
  const lines = ["---"];
  const orderedKeys = [
    "id",
    "title",
    "slug",
    "created",
    "modified",
    "description",
    "cover",
    "tags",
  ];

  for (const key of orderedKeys) {
    if (data[key] === undefined) continue;
    lines.push(`${key}: ${stringifyFrontmatterValue(data[key])}`);
  }

  for (const [key, value] of Object.entries(data)) {
    if (orderedKeys.includes(key) || value === undefined) continue;
    lines.push(`${key}: ${stringifyFrontmatterValue(value)}`);
  }

  lines.push("---", "");
  return lines.join("\n");
}

function normalizeDateValue(value, fallback) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function isRelativeAssetPath(value) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return false;
  }

  const normalized = trimmed.replace(/^<|>$/g, "");
  const extension = path.extname(normalized.split(/[?#]/, 1)[0]).toLowerCase();
  return extension !== ".md" && extension !== ".mdx";
}

function toPublicAssetPath(slug, relativePath) {
  const normalized = relativePath.replace(/^<|>$/g, "");
  const suffixIndex = normalized.search(/[?#]/);
  const pathname =
    suffixIndex === -1 ? normalized : normalized.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : normalized.slice(suffixIndex);
  const safePath = pathname
    .split(/[\\/]/)
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

  return `/uploads/posts/${slug}/${safePath}${suffix}`;
}

function toPostAssetPath(slug, relativePath) {
  return `../../${toPublicAssetPath(slug, relativePath).replace(/^\//, "")}`;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rewriteFrontmatterAssetFields(data, slug) {
  const next = { ...data };

  for (const field of FRONTMATTER_ASSET_FIELDS) {
    if (isRelativeAssetPath(next[field])) {
      next[field] = toPublicAssetPath(slug, next[field]);
    }
  }

  return next;
}

function omitUndefinedEntries(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function rewriteMarkdownAssetPaths(content, slug) {
  return content.replace(
    /(!?\[[^\]]*]\()([^)\n]+)(\))/g,
    (match, start, destination, end) => {
      const trimmed = destination.trim();
      let pathPart = trimmed;
      let suffix = "";

      if (trimmed.startsWith("<")) {
        const closingIndex = trimmed.indexOf(">");
        if (closingIndex === -1) return match;
        pathPart = trimmed.slice(1, closingIndex);
        suffix = trimmed.slice(closingIndex + 1);
      } else {
        const whitespaceIndex = trimmed.search(/\s/);
        if (whitespaceIndex !== -1) {
          pathPart = trimmed.slice(0, whitespaceIndex);
          suffix = trimmed.slice(whitespaceIndex);
        }
      }

      if (!isRelativeAssetPath(pathPart)) {
        return match;
      }

      if (start.startsWith("![")) {
        const altMatch = start.match(/^!\[([^\]]*)\]\($/);
        const alt = altMatch ? altMatch[1] : "";
        return `<img src="${toPostAssetPath(slug, pathPart)}" alt="${escapeHtmlAttribute(alt)}" />`;
      }

      return `${start}${toPostAssetPath(slug, pathPart)}${suffix}${end}`;
    },
  );
}

function normalizeCodeFenceLanguages(content) {
  return content.replace(/^```other(\s*)$/gm, "```bash$1");
}

function isMarkdownFile(name) {
  return name.endsWith(".md") || name.endsWith(".mdx");
}

function isIndexLikeMarkdownFile(name) {
  const lowerName = name.toLowerCase();
  return (
    lowerName === "index.auto.md" ||
    lowerName === "index.auto.mdx" ||
    lowerName === "index.md" ||
    lowerName === "index.mdx"
  );
}

function findPostEntryFilename(postDir, entryName) {
  const candidateNames = ["post.md", "index.md", "post.mdx", "index.mdx"];
  const explicitEntry = candidateNames.find((name) =>
    fs.existsSync(path.join(postDir, name)),
  );

  if (explicitEntry) {
    return explicitEntry;
  }

  const markdownFiles = fs
    .readdirSync(postDir, { withFileTypes: true })
    .filter(
      (child) =>
        child.isFile() &&
        !child.name.startsWith(".") &&
        isMarkdownFile(child.name) &&
        !isIndexLikeMarkdownFile(child.name),
    )
    .map((child) => child.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  if (markdownFiles.length === 0) {
    return null;
  }

  const sameNameFile = markdownFiles.find((filename) => {
    const basename = path.basename(filename, path.extname(filename));
    return basename === entryName;
  });

  return sameNameFile || markdownFiles[0];
}

function listPostEntries(rootDir) {
  const posts = [];
  const seenEntries = new Set();

  function addPostEntry(entryPath, sourceDir, fallbackSlug, sortKey) {
    const normalizedEntryPath = path.normalize(entryPath);
    if (seenEntries.has(normalizedEntryPath)) return;
    seenEntries.add(normalizedEntryPath);

    posts.push({
      entryPath: normalizedEntryPath,
      sourceDir,
      fallbackSlug,
      sortKey,
    });
  }

  function visitDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (!entry.isDirectory()) continue;

      const postDir = path.join(currentDir, entry.name);
      const entryFilename = findPostEntryFilename(postDir, entry.name);
      const relativeDir = path.relative(rootDir, postDir);
      const fallbackSlug = relativeDir.split(path.sep).pop() || entry.name;

      if (entryFilename) {
        addPostEntry(
          path.join(postDir, entryFilename),
          postDir,
          fallbackSlug,
          relativeDir,
        );
      }

      visitDirectory(postDir);
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (!entry.isFile()) continue;
      if (!isMarkdownFile(entry.name)) continue;
      if (isIndexLikeMarkdownFile(entry.name)) continue;

      const filePath = path.join(currentDir, entry.name);
      const basename = path.basename(entry.name, path.extname(entry.name));
      const relativeFile = path.relative(rootDir, filePath);

      addPostEntry(filePath, currentDir, basename, relativeFile);
    }
  }

  visitDirectory(rootDir);
  return posts.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "zh-CN"));
}

function copyPostAssets(sourceDir, slug, entryPath) {
  const targetDir = path.join(OUTPUT_ASSET_DIR, slug);
  let copied = 0;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (absolutePath === entryPath) continue;
      if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) continue;

      const relativePath = path.relative(sourceDir, absolutePath);
      const destinationPath = path.join(targetDir, relativePath);
      ensureDirectory(path.dirname(destinationPath));
      fs.copyFileSync(absolutePath, destinationPath);
      ensureFileMode(destinationPath);
      copied += 1;
    }
  }

  if (fs.existsSync(sourceDir)) {
    walk(sourceDir);
  }

  return copied;
}

if (!fs.existsSync(BLOG_DIR)) {
  console.error(`[sync-posts] Blog directory not found: ${BLOG_DIR}`);
  process.exit(1);
}

ensureDirectory(OUTPUT_DIR);
ensureDirectory(OUTPUT_ASSET_DIR);
resetOutputDir(OUTPUT_DIR);
resetOutputDir(OUTPUT_ASSET_DIR);

const posts = listPostEntries(BLOG_DIR);
const seenSlugs = new Set();

let count = 0;
let assetCount = 0;

for (const post of posts) {
  const raw = fs.readFileSync(post.entryPath, "utf-8");
  const { data, content } = matter(raw);

  const slug = String(data.slug || post.fallbackSlug).trim();
  if (!slug) {
    console.error(`[sync-posts] Missing slug for ${post.entryPath}`);
    process.exit(1);
  }

  if (seenSlugs.has(slug)) {
    console.error(`[sync-posts] Duplicate slug detected: ${slug}`);
    process.exit(1);
  }
  seenSlugs.add(slug);

  const fallbackCreated = new Date().toISOString();
  const created = normalizeDateValue(
    data.created ?? data.modified,
    fallbackCreated,
  );
  const modified = normalizeDateValue(data.modified ?? data.created, created);
  const title = String(data.title || post.fallbackSlug).trim();
  const description = String(data.description || makeExcerpt(content)).trim();
  const tags = normalizeTags(data.tags);

  const extras = { ...data };
  delete extras.id;
  delete extras.title;
  delete extras.slug;
  delete extras.created;
  delete extras.modified;
  delete extras.description;
  delete extras.tags;

  const normalized = omitUndefinedEntries(
    rewriteFrontmatterAssetFields(
      {
        ...extras,
        id: data.id ? String(data.id).trim() : undefined,
        title,
        slug,
        created,
        modified,
        description,
        tags,
      },
      slug,
    ),
  );

  const rewrittenContent = normalizeCodeFenceLanguages(
    rewriteMarkdownAssetPaths(content.trim(), slug),
  );
  const output = `${frontmatterToString(normalized)}${rewrittenContent}\n`;
  const outputPath = path.join(OUTPUT_DIR, `${slug}.md`);
  fs.writeFileSync(outputPath, output, "utf-8");
  ensureFileMode(outputPath);
  assetCount += copyPostAssets(post.sourceDir, slug, post.entryPath);
  count += 1;
}

console.log(
  `[sync-posts] Synced ${count} post(s) and ${assetCount} asset(s) from ${BLOG_DIR}`,
);
