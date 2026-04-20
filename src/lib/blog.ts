import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"posts">;
export const POSTS_PER_PAGE = 8;

export async function getAllPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("posts");
  return posts.sort(
    (a, b) => b.data.created.getTime() - a.data.created.getTime(),
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getTagHref(tag: string) {
  return `/tags/${encodeURIComponent(tag)}/`;
}

export function getPostUrl(post: BlogPost) {
  return `/post/${post.data.slug}/`;
}

export function buildHomePagePath(page: number) {
  return page <= 1 ? "/" : `/page/${page}/`;
}

export function getPaginatedPosts(posts: BlogPost[], page: number) {
  const start = (page - 1) * POSTS_PER_PAGE;
  return posts.slice(start, start + POSTS_PER_PAGE);
}

export function getTotalPages(totalPosts: number) {
  return Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
}

export function getTopTags(posts: BlogPost[], limit = 12) {
  const tagCounts = posts
    .flatMap((post) => post.data.tags)
    .reduce((acc, tag) => {
      acc.set(tag, (acc.get(tag) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit);
}

export function groupPostsByYear(posts: BlogPost[]) {
  return posts.reduce(
    (acc, post) => {
      const year = String(post.data.created.getFullYear());
      acc[year] ??= [];
      acc[year].push(post);
      return acc;
    },
    {} as Record<string, BlogPost[]>,
  );
}
