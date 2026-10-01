import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string().optional(),
    summary: z.string(),
    order: z.coerce.number().default(99),
    image: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.string().optional(),
    journal: z.string(),
    year: z.coerce.number(),
    doi: z.string().optional(),
    link: z.string().optional(),
    area: z.string().optional(),
    featured: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    interests: z.string().optional(),
    email: z.string().optional(),
    image: z.string().optional(),
    order: z.coerce.number().default(99),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string().default('Lab news'),
    summary: z.string(),
    image: z.string().optional(),
    link: z.string().optional(),
  }),
});

export const collections = { research, publications, people, news };
