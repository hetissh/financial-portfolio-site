// Defines runtime contracts for profile, research, covers, links, and attachments.
import { z } from 'zod';
import {
  googleSheetUrl,
  googleEmbedUrl,
  microsoftEmbedUrl,
  microsoftWorkbookUrl,
} from './sheet-embed';
export { googleSheetUrl } from './sheet-embed';
import { releaseReadiness } from './release-readiness';
import { richDocumentSchema } from './rich-content';
import { themeArtwork, heroPatterns } from './artwork';
export const cropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  zoom: z.number().min(1).max(5),
});

const text = z.string().trim().min(1);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Use a valid calendar date in YYYY-MM-DD format');
// Public URLs must never carry userinfo that could leak in exported markup.
const publicUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Use an HTTPS URL without embedded credentials');
const contactUrl = z.string().refine((value) => {
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Use a valid mailto or HTTPS URL without embedded credentials');
const localAsset = z
  .string()
  .regex(/^\/(?!\/)[a-zA-Z0-9_./-]+$/)
  .refine((value) => !value.split('/').includes('..'), 'Asset must stay inside public/');

export const researchStatuses = ['draft', 'sample', 'published'] as const;
export const researchThemes = ['forest', 'clay', 'blue'] as const;
export const wordCoverSchema = z
  .object({
    word: z
      .string()
      .trim()
      .min(1, 'Enter a word')
      .max(32, 'Use at most 32 characters')
      .regex(/^[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*$/u, 'Use a single word with letters or numbers'),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a colour or enter a six-digit hex colour')
      .transform((value) => value.toLowerCase()),
    foregroundColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a six-digit foreground colour')
      .transform((value) => value.toLowerCase())
      .optional(),
    foregroundOpacity: z.number().min(0).max(1).optional(),
    variation: z.number().int().min(0).max(999).default(0),
    type: z.enum(['theme', 'hero', 'image', 'generated']).optional(),
    preset: z
      .string()
      .refine((id) => themeArtwork.some((p) => p.id === id), 'Choose a theme artwork')
      .optional(),
    hero: z
      .string()
      .refine((id) => heroPatterns.some((p) => p.id === id), 'Choose a Hero Pattern')
      .optional(),
    imageId: z.string().uuid().optional(),
    unsplash: z
      .object({
        imageUrl: z
          .string()
          .url()
          .refine((value) => new URL(value).hostname === 'images.unsplash.com'),
        photoUrl: publicUrl.refine((value) => new URL(value).hostname === 'unsplash.com'),
        photographer: text.max(120),
        photographerUrl: publicUrl.refine((value) => new URL(value).hostname === 'unsplash.com'),
      })
      .optional(),
    crop: cropSchema.optional(),
    seed: z.string().uuid().optional(),
    generatorVersion: z.literal(1).optional(),
  })
  .superRefine((cover, ctx) => {
    for (const [type, field] of [
      ['theme', 'preset'],
      ['hero', 'hero'],
      ['image', 'imageId'],
    ] as const) {
      if (cover.type === type && !cover[field] && !(type === 'image' && cover.unsplash))
        ctx.addIssue({ code: 'custom', path: [field], message: `Choose ${type} artwork` });
    }
    if (cover.type === 'image' && cover.imageId && !cover.crop)
      ctx.addIssue({ code: 'custom', path: ['crop'], message: 'Crop the image before saving' });
  })
  .refine((cover) => !cover.seed || cover.generatorVersion === 1, {
    message: 'Seeded covers need a supported generator version',
    path: ['generatorVersion'],
  });
export type WordCover = z.infer<typeof wordCoverSchema>;

export const profileSchema = z.object({
  displayName: text,
  monogram: text.max(3),
  role: text,
  portfolioTitle: text.max(70).optional(),
  headline: text,
  headlineAccent: text.optional(),
  intro: text,
  researchLead: text.max(100).optional(),
  researchAccent: text.max(100).optional(),
  bio: z.array(text).min(1),
  isPlaceholder: z.boolean(),
  contactLinks: z.array(z.object({ label: text, href: contactUrl })),
  resume: localAsset.optional(),
  resumeLabel: text.max(80).optional(),
  resumeVisible: z.boolean().default(false),
  certifications: z
    .array(
      z
        .object({
          name: text.max(120),
          issuer: text.max(120),
          issuedAt: isoDate.optional(),
          expiresAt: isoDate.optional(),
          credentialId: text.max(120).optional(),
          url: publicUrl.optional(),
          pdf: z
            .string()
            .regex(
              /^\/downloads\/certifications\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/,
              'Upload a certification PDF',
            )
            .optional(),
          visible: z.boolean().default(true),
        })
        .refine((item) => !item.expiresAt || !item.issuedAt || item.expiresAt >= item.issuedAt, {
          path: ['expiresAt'],
          message: 'Expiry date must not precede issue date',
        }),
    )
    .max(24)
    .default([]),
  about: z
    .object({
      label: text,
      heading: text,
      accent: z.string().trim(),
      principles: z.array(text.max(160)).max(8),
    })
    .optional(),
  contact: z
    .object({
      label: text,
      heading: text,
      accent: z.string().trim(),
      intro: text,
      email: z.string().trim().email().optional(),
      emailLabel: text,
      emailSubject: text.max(200),
    })
    .optional(),
});
export const attachmentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('excel'),
    id: z.string().uuid(),
    label: text.max(120),
    embedUrl: microsoftEmbedUrl.optional(),
    originalUrl: microsoftWorkbookUrl.optional(),
  }),
  z.object({
    kind: z.literal('google'),
    id: z.string().uuid(),
    label: text.max(120),
    url: googleSheetUrl,
    embedUrl: googleEmbedUrl.optional(),
  }),
  z.object({
    kind: z.literal('microsoft'),
    id: z.string().uuid(),
    label: text.max(120),
    embedUrl: microsoftEmbedUrl,
    originalUrl: microsoftWorkbookUrl.optional(),
  }),
]);
export type Attachment = z.infer<typeof attachmentSchema>;
export const researchSchema = z
  .object({
    id: text,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: text,
    summary: text,
    category: text,
    tags: z.array(text),
    publishedAt: isoDate,
    updatedAt: isoDate.optional(),
    status: z.enum(researchStatuses),
    featuredOrder: z.number().int().nonnegative().optional(),
    noteNumber: z.number().int().min(1).max(9999).optional(),
    theme: z.enum(researchThemes),
    cover: wordCoverSchema.optional(),
    question: text,
    sections: z
      .array(
        z
          .object({
            heading: text,
            paragraphs: z.array(text).default([]),
            body: richDocumentSchema.optional(),
            prompts: z.array(text).optional(),
          })
          .refine((section) => Boolean(section.body || section.paragraphs.length), {
            message: 'Add some content to this section',
            path: ['paragraphs'],
          }),
      )
      .min(1),
    sources: z.array(z.object({ title: text, url: publicUrl })).default([]),
    download: localAsset.optional(),
    attachments: z.array(attachmentSchema).max(12).default([]),
  })
  .refine((item) => !item.updatedAt || item.updatedAt >= item.publishedAt, {
    message: 'Update date must not precede publication',
    path: ['updatedAt'],
  });

export type Profile = z.infer<typeof profileSchema>;
export type Research = z.infer<typeof researchSchema>;
export type SiteMode = 'preview' | 'production';
export function parseResearch(value: unknown): Research[] {
  const records = z.array(researchSchema).parse(value);
  for (const key of ['id', 'slug'] as const) {
    if (new Set(records.map((item) => item[key])).size !== records.length)
      throw new Error(`Duplicate research ${key}`);
  }
  return records;
}
export function sortResearch<T extends Research>(records: T[], order: readonly string[] = []): T[] {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...records].sort(
    (a, b) =>
      (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
      (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER) ||
      b.publishedAt.localeCompare(a.publishedAt) ||
      a.id.localeCompare(b.id),
  );
}
export function visibleResearch(
  records: Research[],
  mode: SiteMode,
  order: readonly string[] = [],
): Research[] {
  return sortResearch(
    records.filter(
      (item) => item.status === 'published' || (mode === 'preview' && item.status === 'sample'),
    ),
    order,
  );
}
export function validateRelease(
  profile: Profile,
  records: Research[],
  siteUrl: string | undefined,
) {
  const blocker = releaseReadiness(profile, records, siteUrl).checks.find((check) => !check.ok);
  if (blocker) throw new Error(blocker.error);
}
