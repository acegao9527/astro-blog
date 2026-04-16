import rss from "@astrojs/rss";
import { getAllPosts } from "../lib/blog";

export async function GET(context) {
  const posts = await getAllPosts();

  return rss({
    title: "Ace Lee 的博客",
    description: "关于产品、技术、写作与个人系统的静态博客。",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.created,
      link: `/post/${post.data.slug}/`,
      categories: post.data.tags,
    })),
  });
}
