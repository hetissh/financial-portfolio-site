import { richImageIds, richText, type RichDocument } from "./rich-content";
import { imageExists } from "./admin/images";
import { workbookExists } from "./admin/workbooks";
import { researchOrderSchema } from "./research-order";
import fs from "node:fs";
import path from "node:path";
import { parseResearch, profileSchema, visibleResearch, validateRelease, type SiteMode } from "./content-schema";

export function getSiteMode(): SiteMode {
  const value = process.env.SITE_MODE || "preview";
  if (value !== "preview" && value !== "production") throw new Error("SITE_MODE must be preview or production.");
  return value;
}
// PORTFOLIO_CONTENT_DIR lets the local admin's browser tests edit a copy of the content.
export function contentRoot() {
  const override = process.env.PORTFOLIO_ADMIN === "1" ? process.env.PORTFOLIO_CONTENT_DIR : undefined;
  return override ? path.resolve(override) : path.join(process.cwd(), "src/content");
}
export function readProfileFile(root = contentRoot()): unknown {
  return JSON.parse(fs.readFileSync(path.join(root, "profile.json"), "utf8"));
}
export function readResearchFiles(root = contentRoot()): { file: string; data: unknown }[] {
  const directory = path.join(root, "research");
  return fs.readdirSync(directory).filter((file) => file.endsWith(".json")).sort()
    .map((file) => ({ file, data: JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")) }));
}
export function readResearchOrder(root = contentRoot()): string[] {
  const file = path.join(root, 'research-order.json');
  return fs.existsSync(file) ? researchOrderSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).ids : [];
}
export function assetExists(asset: string) {
  try {
    const root = fs.realpathSync(path.join(process.cwd(), 'public'));
    const file = fs.realpathSync(path.join(root, asset));
    return file.startsWith(`${root}${path.sep}`) && fs.statSync(file).isFile();
  } catch { return false; }
}
export function loadContent() {
  const root = contentRoot();
  const profile = profileSchema.parse(readProfileFile(root));
  const records = parseResearch(readResearchFiles(root).map((entry) => entry.data));
  for (const asset of [profile.resume, ...records.map((item) => item.download)].filter((value): value is string => Boolean(value))) {
    if (!assetExists(asset)) throw new Error(`Missing local asset: ${asset}`);
  }
  for (const record of records) for (const attachment of record.attachments) if (attachment.kind === "excel" && !workbookExists(attachment.id, root)) throw new Error(`Missing workbook for ${record.slug}: ${attachment.id}`);
  for (const record of records) if (record.cover?.type === "image" && !imageExists(record.cover.imageId!, root)) throw new Error(`Missing cover image for ${record.slug}`);
  for (const record of records) for (const section of record.sections) if (section.body) for (const id of richImageIds(section.body.doc)) if (!imageExists(id, root)) throw new Error(`Missing article image for ${record.slug}: ${id}`);
  const mode = getSiteMode();
  if (mode === "production") validateRelease(profile, records, process.env.SITE_URL);
  return { profile, research: visibleResearch(records, mode, readResearchOrder(root)), mode };
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
export function readingTime(item: { sections: { paragraphs: string[]; body?: RichDocument; prompts?: string[] }[] }) {
  const words = item.sections.flatMap((s) => [...(s.body ? [richText(s.body.doc)] : s.paragraphs), ...(s.prompts ?? [])]).join(" ").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 180));
}
