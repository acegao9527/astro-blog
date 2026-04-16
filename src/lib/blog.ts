import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"posts">;

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
