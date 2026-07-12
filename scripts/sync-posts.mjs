import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import {
  ROOT_DIR,
  getProjectConfig,
  requireContentSourceConfig,
} from "./config.mjs";

const contentSource = requireContentSourceConfig(
  getProjectConfig(),
  "content sync",
);
const OUTPUT_DIR = path.join(ROOT_DIR, ".cache", "content", "posts");
const OUTPUT_ABOUT_DIR = path.join(ROOT_DIR, ".cache", "content", "about");
const OUTPUT_ASSET_DIR = path.join(ROOT_DIR, "public", "uploads", "posts");
const FRONTMATTER_ASSET_FIELDS = ["cover", "hero", "image", "ogImage"];
const FILE_MODE = 0o644;
const DIRECTORY_MODE = 0o755;
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_WEBP_QUALITY = 82;
const IMAGE_OUTPUT_EXTENSION = ".webp";
const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const EXCLUDED_POST_SOURCE_DIRECTORIES = new Set([
  "about",
  "assets",
  "auto-draft",
  "draft",
  "workbench",
]);
const imageOptimizationStats = {
  optimized: 0,
  originalBytes: 0,
  outputBytes: 0,
};

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  fs.chmodSync(dir, DIRECTORY_MODE);
}

function resetOutputDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  fs.chmodSync(dir, DIRECTORY_MODE);
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd || ROOT_DIR,
    encoding: "utf-8",
  });

  if (result.status === 0) {
    return result.stdout.trim();
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  throw new Error(
    `[sync-posts] git ${args.join(" ")} failed${output ? `:\n${output}` : ""}`,
  );
}

function tryRunGit(args, options = {}) {
  try {
    return { ok: true, stdout: runGit(args, options) };
  } catch (error) {
    return { ok: false, error };
  }
}

function checkoutBlogRepositorySha(source) {
  if (!source.repoSha) return;

  const currentSha = runGit(["rev-parse", "HEAD"], { cwd: source.cacheDir });
  if (currentSha === source.repoSha) {
    console.log(`[sync-posts] Using blog repository commit ${source.repoSha}`);
    return;
  }

  console.log(`[sync-posts] Fetching blog repository commit ${source.repoSha}`);
  const directFetch = tryRunGit(["fetch", "--depth=1", "origin", source.repoSha], {
    cwd: source.cacheDir,
  });

  if (!directFetch.ok && source.repoRef) {
    runGit(["fetch", "--depth=200", "origin", source.repoRef], {
      cwd: source.cacheDir,
    });
  } else if (!directFetch.ok) {
    throw directFetch.error;
  }

  runGit(["checkout", "--detach", source.repoSha], { cwd: source.cacheDir });
  runGit(["reset", "--hard", source.repoSha], { cwd: source.cacheDir });
}

function cloneBlogRepository(source) {
  ensureDirectory(path.dirname(source.cacheDir));

  const args = ["clone", "--depth=1"];
  if (source.repoRef) {
    args.push("--branch", source.repoRef, "--single-branch");
  }
  args.push(source.repoUrl, source.cacheDir);

  console.log(`[sync-posts] Cloning blog repository ${source.repoUrl}`);
  runGit(args);
  checkoutBlogRepositorySha(source);
}

function updateBlogRepository(source) {
  const gitDir = path.join(source.cacheDir, ".git");

  if (!fs.existsSync(gitDir)) {
    fs.rmSync(source.cacheDir, { recursive: true, force: true });
    cloneBlogRepository(source);
    return;
  }

  const remoteUrl = runGit(["remote", "get-url", "origin"], {
    cwd: source.cacheDir,
  });

  if (remoteUrl !== source.repoUrl) {
    fs.rmSync(source.cacheDir, { recursive: true, force: true });
    cloneBlogRepository(source);
    return;
  }

  runGit(["reset", "--hard"], { cwd: source.cacheDir });
  runGit(["clean", "-fdx"], { cwd: source.cacheDir });

  if (source.repoRef) {
    console.log(
      `[sync-posts] Fetching blog repository ${source.repoUrl} (${source.repoRef})`,
    );
    runGit(["fetch", "--depth=1", "origin", source.repoRef], {
      cwd: source.cacheDir,
    });
    runGit(["checkout", "--detach", "FETCH_HEAD"], { cwd: source.cacheDir });
    runGit(["reset", "--hard", "FETCH_HEAD"], { cwd: source.cacheDir });
    checkoutBlogRepositorySha(source);
    return;
  }

  console.log(`[sync-posts] Pulling blog repository ${source.repoUrl}`);
  const branch = runGit(["branch", "--show-current"], { cwd: source.cacheDir });
  if (!branch) {
    fs.rmSync(source.cacheDir, { recursive: true, force: true });
    cloneBlogRepository(source);
    return;
  }

  const pullResult = tryRunGit(["pull", "--ff-only"], { cwd: source.cacheDir });
  if (!pullResult.ok) {
    console.warn("[sync-posts] Pull failed; recloning cached blog repository.");
    fs.rmSync(source.cacheDir, { recursive: true, force: true });
    cloneBlogRepository(source);
  }

  checkoutBlogRepositorySha(source);
}

function resolveBlogDir(source) {
  if (source.kind === "directory") {
    return source.blogDir;
  }

  updateBlogRepository(source);
  return source.cacheDir;
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

function splitAssetPath(value) {
  const normalized = String(value).replace(/^<|>$/g, "");
  const suffixIndex = normalized.search(/[?#]/);

  return {
    pathname: suffixIndex === -1 ? normalized : normalized.slice(0, suffixIndex),
    suffix: suffixIndex === -1 ? "" : normalized.slice(suffixIndex),
  };
}

function isOptimizableImagePath(pathname) {
  return OPTIMIZABLE_IMAGE_EXTENSIONS.has(path.extname(pathname).toLowerCase());
}

function toOutputAssetPath(relativePath) {
  const safePath = toSafeAssetPath(relativePath);

  if (!isOptimizableImagePath(safePath)) {
    return safePath;
  }

  return (
    safePath.slice(0, -path.extname(safePath).length) + IMAGE_OUTPUT_EXTENSION
  );
}

function toPublicAssetPath(slug, relativePath) {
  const { pathname, suffix } = splitAssetPath(relativePath);
  const safePath = toOutputAssetPath(pathname);

  return `/uploads/posts/${slug}/${safePath}${suffix}`;
}

function toSafeAssetPath(relativePath) {
  return relativePath
    .split(/[\\/]/)
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function splitLinkedDestination(destination) {
  const trimmed = destination.trim();
  let pathPart = trimmed;
  let suffix = "";

  if (trimmed.startsWith("<")) {
    const closingIndex = trimmed.indexOf(">");
    if (closingIndex === -1) return null;
    pathPart = trimmed.slice(1, closingIndex);
    suffix = trimmed.slice(closingIndex + 1);
  } else {
    const whitespaceIndex = trimmed.search(/\s/);
    if (whitespaceIndex !== -1) {
      pathPart = trimmed.slice(0, whitespaceIndex);
      suffix = trimmed.slice(whitespaceIndex);
    }
  }

  return { pathPart, suffix };
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
      const parsed = splitLinkedDestination(destination);
      if (!parsed) return match;
      const { pathPart, suffix } = parsed;

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

function collectMarkdownAssetPaths(content) {
  const assetPaths = new Set();

  for (const match of content.matchAll(/!?\[[^\]]*]\(([^)\n]+)\)/g)) {
    const parsed = splitLinkedDestination(match[1]);
    if (!parsed) continue;
    if (isRelativeAssetPath(parsed.pathPart)) {
      assetPaths.add(parsed.pathPart);
    }
  }

  return assetPaths;
}

function collectFrontmatterAssetPaths(data) {
  const assetPaths = new Set();

  for (const field of FRONTMATTER_ASSET_FIELDS) {
    if (isRelativeAssetPath(data[field])) {
      assetPaths.add(String(data[field]));
    }
  }

  return assetPaths;
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
    lowerName === "agents.md" ||
    lowerName === "claude.md" ||
    lowerName === "gemini.md" ||
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
      const relativeDir = path.relative(rootDir, postDir);
      const [topLevelDir] = relativeDir.split(path.sep);

      if (EXCLUDED_POST_SOURCE_DIRECTORIES.has(topLevelDir)) continue;

      const entryFilename = findPostEntryFilename(postDir, entry.name);
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

function syncAboutPage(rootDir) {
  const sourcePath = path.join(rootDir, "about", "index.md");
  if (!fs.existsSync(sourcePath)) {
    return 0;
  }

  const raw = fs.readFileSync(sourcePath, "utf-8");
  const { data, content } = matter(raw);
  const fallbackModified = new Date().toISOString();
  const normalized = omitUndefinedEntries({
    ...data,
    title: String(data.title || "关于我").trim(),
    description: String(data.description || makeExcerpt(content)).trim(),
    type: String(data.type || "page").trim(),
    status: String(data.status || "published").trim(),
    modified: normalizeDateValue(data.modified, fallbackModified),
  });
  const output = `${frontmatterToString(normalized)}${normalizeCodeFenceLanguages(content.trim())}\n`;
  const outputPath = path.join(OUTPUT_ABOUT_DIR, "index.md");

  fs.writeFileSync(outputPath, output, "utf-8");
  ensureFileMode(outputPath);
  return 1;
}

function formatByteSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function writeOptimizedImage(sourcePath, destinationPath, originalBytes) {
  try {
    await sharp(sourcePath)
      .rotate()
      .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: IMAGE_WEBP_QUALITY })
      .toFile(destinationPath);
  } catch (error) {
    throw new Error(
      `[sync-posts] Failed to optimize image ${sourcePath}: ${error.message}`,
    );
  }

  const outputBytes = fs.statSync(destinationPath).size;
  imageOptimizationStats.optimized += 1;
  imageOptimizationStats.originalBytes += originalBytes;
  imageOptimizationStats.outputBytes += outputBytes;
}

async function copyReferencedAssets(sourceDir, slug, relativeAssetPaths) {
  const targetDir = path.join(OUTPUT_ASSET_DIR, slug);
  let copied = 0;
  const copiedDestinations = new Map();

  for (const relativePath of relativeAssetPaths) {
    const { pathname } = splitAssetPath(relativePath);
    const absolutePath = path.resolve(sourceDir, pathname);
    const sourceStats = fs.existsSync(absolutePath)
      ? fs.statSync(absolutePath)
      : undefined;

    if (!sourceStats?.isFile()) {
      throw new Error(
        `[sync-posts] Missing referenced asset ${relativePath} from ${sourceDir}`,
      );
    }

    const destinationPath = path.join(targetDir, toOutputAssetPath(pathname));
    const previousSource = copiedDestinations.get(destinationPath);
    if (previousSource === absolutePath) {
      continue;
    }

    if (previousSource) {
      throw new Error(
        `[sync-posts] Asset output collision: ${absolutePath} and ${previousSource} both map to ${destinationPath}`,
      );
    }

    copiedDestinations.set(destinationPath, absolutePath);
    ensureDirectory(path.dirname(destinationPath));

    if (isOptimizableImagePath(pathname)) {
      await writeOptimizedImage(absolutePath, destinationPath, sourceStats.size);
    } else {
      fs.copyFileSync(absolutePath, destinationPath);
    }

    ensureFileMode(destinationPath);
    copied += 1;
  }

  return copied;
}

const BLOG_DIR = resolveBlogDir(contentSource);

if (!fs.existsSync(BLOG_DIR)) {
  console.error(`[sync-posts] Blog directory not found: ${BLOG_DIR}`);
  process.exit(1);
}

ensureDirectory(OUTPUT_DIR);
ensureDirectory(OUTPUT_ABOUT_DIR);
ensureDirectory(OUTPUT_ASSET_DIR);
resetOutputDir(OUTPUT_DIR);
resetOutputDir(OUTPUT_ABOUT_DIR);
resetOutputDir(OUTPUT_ASSET_DIR);

const aboutCount = syncAboutPage(BLOG_DIR);
const posts = listPostEntries(BLOG_DIR);
const seenSlugs = new Set();

let count = 0;
let assetCount = 0;

for (const post of posts) {
  const raw = fs.readFileSync(post.entryPath, "utf-8");
  const { data, content } = matter(raw);
  const status = String(data.status ?? "published").trim().toLowerCase();

  if (!["published", "archived"].includes(status)) {
    continue;
  }

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
  assetCount += await copyReferencedAssets(
    post.sourceDir,
    slug,
    new Set([
      ...collectMarkdownAssetPaths(content),
      ...collectFrontmatterAssetPaths(data),
    ]),
  );
  count += 1;
}

console.log(
  `[sync-posts] Synced ${count} post(s), ${aboutCount} about page(s), and ${assetCount} asset(s) from ${BLOG_DIR}`,
);

if (imageOptimizationStats.optimized > 0) {
  const savedBytes =
    imageOptimizationStats.originalBytes - imageOptimizationStats.outputBytes;
  const savedPercent =
    imageOptimizationStats.originalBytes > 0
      ? Math.round((savedBytes / imageOptimizationStats.originalBytes) * 100)
      : 0;

  console.log(
    `[sync-posts] Optimized ${imageOptimizationStats.optimized} image(s) to WebP: ${formatByteSize(
      imageOptimizationStats.originalBytes,
    )} -> ${formatByteSize(
      imageOptimizationStats.outputBytes,
    )} (${savedPercent}% smaller)`,
  );
}
