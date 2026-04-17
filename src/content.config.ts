import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/posts" }),
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

export const collections = { posts };
