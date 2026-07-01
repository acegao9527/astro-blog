import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./.cache/content/posts" }),
  schema: z.object({
    id: z.string().optional(),
    title: z.string(),
    slug: z.string(),
    created: z.coerce.date(),
    modified: z.coerce.date(),
    description: z.string().min(1),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: "index.md", base: "./.cache/content/about" }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(1),
    type: z.literal("page"),
    status: z.string().default("published"),
    modified: z.coerce.date().optional(),
  }),
});

export const collections = { posts, about };
