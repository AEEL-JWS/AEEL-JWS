import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const md = <T extends z.ZodObject<z.ZodRawShape>>(base: string, schema: T) => defineCollection({ loader: glob({ pattern: '**/*.md', base }), schema });
const text = z.string().optional();
const order = z.coerce.number().default(99);

const research = md('./src/content/research', z.object({ title: z.string(), eyebrow: text, summary: z.string(), order, image: text, featured: z.boolean().default(false) }));
const publications = md('./src/content/publications', z.object({ title: z.string(), authors: text, journal: z.string(), year: z.coerce.number(), volume: text, issue: text, pages: text, bibliography: text, status: text, doi: text, link: text, area: text, publicationType: text, coverType: text, featured: z.boolean().default(false), image: text, order }));
const people = md('./src/content/people', z.object({ name: z.string(), role: z.string(), affiliation: text, degree: text, program: text, researchArea: text, interests: text, introduction: text, keywords: text, email: text, image: text, sourceImageUrl: text, link: text, active: z.boolean().default(true), order }));
const alumni = md('./src/content/alumni', z.object({ name: z.string(), category: text, degree: text, previousPosition: text, graduationYear: z.coerce.number().optional(), graduationMonth: text, currentStatus: text, currentPosition: text, currentOrganization: text, currentAffiliation: text, currentText: text, image: text, link: text, active: z.boolean().default(true), order }));
const patents = md('./src/content/patents', z.object({ title: z.string(), inventors: text, country: text, number: text, applicationDate: z.coerce.date().optional(), registrationDate: z.coerce.date().optional(), status: text, link: text, order }));
const conferences = md('./src/content/conferences', z.object({ title: z.string(), authors: text, conference: text, location: text, date: z.coerce.date(), presentationType: z.enum(['Oral','Poster','Invited','Keynote']).optional(), link: text, order }));
const notices = md('./src/content/notices', z.object({ title: z.string(), date: z.coerce.date(), category: text, sourceTitle: text, sourceUrl: text, legacyViews: z.coerce.number().optional(), image: text, featured: z.boolean().default(false), active: z.boolean().default(true), attachment: text, pinned: z.boolean().default(false), author: text, body: text }));
const news = md('./src/content/news', z.object({ title: z.string(), date: z.coerce.date(), category: z.string().default('Lab news'), summary: z.string(), image: text, link: text, featured: z.boolean().default(false) }));
const gallery = md('./src/content/gallery', z.object({ title: z.string(), date: z.coerce.date(), category: text, description: text, cover: text, photos: z.array(z.object({ image: z.string(), caption: text })).default([]), order }));

export const collections = { research, publications, people, alumni, patents, conferences, notices, news, gallery };
