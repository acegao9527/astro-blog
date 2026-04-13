import fs from "node:fs";
import path from "node:path";

const BLOG_DIR =
  "/Users/acelee/Library/Mobile Documents/iCloud~com~coderforart~iOS~MWeb/Documents/blog";

export interface Post {
  id: string;
  slug: string;
  title: string;
  created: string;
  modified: string;
  tags: string[];
  body: string;
}

function parseFrontmatter(content: string): {
  metadata: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { metadata: {}, body: content };

  const metadataStr = match[1];
  const metadata: Record<string, string> = {};
  metadataStr.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      const value = valueParts.join(":").trim();
      // Handle array format: tags: [tag1, tag2]
      if (key.trim() === "tags" && value.startsWith("[")) {
        metadata[key.trim()] = value;
      } else {
        metadata[key.trim()] = value.replace(/^["']|["']$/g, "");
      }
    }
  });

  return {
    metadata,
    body: content.slice(match[0].length).trim(),
  };
}

export function getPosts(): Post[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  return files.map((filename) => {
    const filePath = path.join(BLOG_DIR, filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { metadata, body } = parseFrontmatter(fileContent);

    const id = metadata.id || filename.replace(".md", "");
    const slug = metadata.slug || filename.replace(".md", "");

    // Parse tags
    let tags: string[] = [];
    if (metadata.tags) {
      if (metadata.tags.startsWith("[")) {
        tags = metadata.tags
          .slice(1, -1)
          .split(",")
          .map((t) => t.trim().replace(/^["']|["']$/g, ""));
      } else {
        tags = metadata.tags.split(",").map((t) => t.trim());
      }
    }

    return {
      id,
      slug,
      title: metadata.title || slug,
      created:
        metadata.created || metadata.modified || new Date().toISOString(),
      modified:
        metadata.modified || metadata.created || new Date().toISOString(),
      tags,
      body,
    };
  });
}

export function getPostBySlug(slug: string): Post | undefined {
  const posts = getPosts();
  return posts.find((p) => p.slug === slug || p.id === slug);
}
