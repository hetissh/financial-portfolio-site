import { richImageIds } from "../rich-content";
import { imageExists } from "./images";
import { workbookExists } from "./workbooks";
import { createHash, randomUUID } from "node:crypto";
// Reads and writes content files for the local admin. Every write validates the full
// collection with the same schema the build uses, so the admin cannot save content
// that would fail `npm run validate:content`.
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { parseResearch, profileSchema, researchSchema, sortResearch, type Profile, type Research } from "@/lib/content-schema";
import { assetExists, contentRoot, readProfileFile, readResearchFiles, readResearchOrder } from "@/lib/content";
import { researchOrderSchema } from "../research-order";
import type { ContentIssue } from "./form";

export class ContentValidationError extends Error {
  constructor(readonly issues: ContentIssue[]) { super(issues.map((issue) => `${issue.path || "record"}: ${issue.message}`).join("; ")); }
}
export class VersionConflictError extends Error { constructor() { super('This record was changed in another tab or editor. Reload to review the saved version before trying again.'); } }
export const recordVersion = (record: unknown) => createHash('sha256').update(JSON.stringify(record)).digest('hex');
function checkVersion(record: unknown, expected?: string) { if (expected && recordVersion(record) !== expected) throw new VersionConflictError(); }
export class RecordNotFoundError extends Error {}

type StoreOptions = { root?: string; trashDir?: string; expectedVersion?: string };
type StoredResearch = { file: string; record: Research };

function friendlyMessage(issue: z.core.$ZodIssue) {
  const key = String(issue.path.at(-1) ?? "");
  if (issue.code === "too_small" && issue.origin === "string") return "Required";
  if (issue.code === "too_small" && issue.origin === "array") return issue.minimum === 1 ? "Add at least one" : `Add at least ${issue.minimum}`;
  if (issue.code === "too_small" && issue.origin === "number") return `Use ${issue.minimum} or higher`;
  if (issue.code === "too_big" && issue.origin === "string") return `Use at most ${issue.maximum} characters`;
  if (issue.code === "invalid_type" && issue.message.endsWith("received undefined")) return "Required";
  if (issue.code === "invalid_type" && issue.expected === "number") return "Use a whole number";
  if (issue.code === "invalid_format") {
    if (key === "slug") return "Use lowercase letters, numbers and single hyphens";
    if (key === "publishedAt" || key === "updatedAt") return "Use a date in YYYY-MM-DD format";
    if (key === "download" || key === "resume") return "Use a path inside public/, such as /downloads/file.pdf";
    if (key === "url") return "Use a full https:// address";
  }
  return issue.message;
}
function valueAt(input: unknown, keys: PropertyKey[]) {
  return keys.reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<PropertyKey, unknown>)[key] : undefined), input);
}
function toIssues(error: z.ZodError, input?: unknown): ContentIssue[] {
  return error.issues.map((issue) => {
    const value = valueAt(input, issue.path);
    return { path: issue.path.join("."), message: typeof value === "string" && !value.trim() ? "Required" : friendlyMessage(issue) };
  });
}
function writeJson(file: string, value: unknown) {
  const temporary = `${file}.tmp-${randomUUID()}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
  }
}
function readStoredResearch(root: string): StoredResearch[] {
  const entries = readResearchFiles(root).map(({ file, data }) => {
    const parsed = researchSchema.safeParse(data);
    if (!parsed.success) throw new Error(`src/content/research/${file} is invalid. Fix it by hand, then reload: ${toIssues(parsed.error).map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
    return { file, record: parsed.data };
  });
  parseResearch(entries.map(entry => entry.record));
  return entries;
}

export function readAdminContent({ root = contentRoot() }: StoreOptions = {}) {
  const profile = profileSchema.parse(readProfileFile(root));
  const research = readStoredResearch(root);
  const ids = readResearchOrder(root);
  return { profile, profileVersion: recordVersion(profile), orderVersion: collectionVersion(research, ids), research: sortResearch(research.map((entry) => ({ ...entry.record, file: entry.file, version: recordVersion(entry.record) })), ids) };
}
export type AdminResearch = Research & { file: string; version: string };

export function saveProfile(input: unknown, { root = contentRoot(), expectedVersion }: StoreOptions = {}): Profile {
  checkVersion(profileSchema.parse(readProfileFile(root)), expectedVersion);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(toIssues(parsed.error, input));
  if (parsed.data.resume && !assetExists(parsed.data.resume)) throw new ContentValidationError([{ path: "resume", message: `No file at public${parsed.data.resume}` }]);
  writeJson(path.join(root, "profile.json"), parsed.data);
  return parsed.data;
}

function defaultTrashDir() {
  return process.env.PORTFOLIO_ADMIN === '1' && process.env.PORTFOLIO_CONTENT_DIR ? path.join(contentRoot(), '.trash') : path.join(process.cwd(), '.admin-trash');
}
function nextId(records: Research[], trashDir: string) {
  if (fs.existsSync(trashDir)) for (const file of fs.readdirSync(trashDir).filter(name => name.endsWith('.json'))) {
    try { const record = researchSchema.safeParse(JSON.parse(fs.readFileSync(path.join(trashDir, file), 'utf8'))); if (record.success) records.push(record.data); } catch { /* An unreadable trash entry cannot be restored by the editor. */ }
  }
  const numbers = records.map((item) => /^note-(\d+)$/.exec(item.id)?.[1]).filter(Boolean).map(Number);
  return `note-${String(Math.max(0, ...numbers) + 1).padStart(2, "0")}`;
}
function validateResearch(input: unknown, others: StoredResearch[], root: string, ownFile?: string): Research {
  const parsed = researchSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(toIssues(parsed.error, input));
  const record = parsed.data;
  const issues: ContentIssue[] = [];
  if (others.some((entry) => entry.record.slug === record.slug) || (`${record.slug}.json` !== ownFile && fs.existsSync(path.join(root, "research", `${record.slug}.json`)))) {
    issues.push({ path: "slug", message: "Another note already uses this slug" });
  }
  if (others.some((entry) => entry.record.id === record.id)) issues.push({ path: "id", message: "Another note already uses this ID" });
  if (record.download && !assetExists(record.download)) issues.push({ path: "download", message: `No file at public${record.download}` });
  if (record.cover?.type === "image" && !imageExists(record.cover.imageId!, root)) issues.push({ path: "cover.imageId", message: "Import this image again; its source is missing" });
  record.sections.forEach((section, index) => { if (section.body) for (const id of richImageIds(section.body.doc)) if (!imageExists(id, root)) issues.push({ path: `sections.${index}.body`, message: "Import this article image again; its source is missing" }); });
  record.attachments.forEach((attachment, index) => { if (attachment.kind === "excel" && !workbookExists(attachment.id, root)) issues.push({ path: `attachments.${index}.id`, message: "Upload this workbook again; its source file is missing" }); });
  if (issues.length) throw new ContentValidationError(issues);
  return record;
}

export function createResearch(input: unknown, { root = contentRoot(), trashDir = defaultTrashDir() }: StoreOptions = {}): AdminResearch {
  const existing = readStoredResearch(root);
  const record = validateResearch({ ...(input as object), id: nextId(existing.map((entry) => entry.record), trashDir) }, existing, root);
  const file = `${record.slug}.json`;
  writeJson(path.join(root, "research", file), record);
  return { ...record, file, version: recordVersion(record) };
}

export function updateResearch(id: string, input: unknown, { root = contentRoot(), expectedVersion }: StoreOptions = {}): AdminResearch {
  const existing = readStoredResearch(root);
  const current = existing.find((entry) => entry.record.id === id);
  if (!current) throw new RecordNotFoundError(`No research note with ID ${id}`);
  checkVersion(current.record, expectedVersion);
  const record = validateResearch({ ...(input as object), id }, existing.filter((entry) => entry !== current), root, current.file);
  // Files are named after the slug; a slug change renames the file.
  const file = `${record.slug}.json`;
  writeJson(path.join(root, "research", file), record);
  if (file !== current.file) fs.rmSync(path.join(root, "research", current.file));
  return { ...record, file, version: recordVersion(record) };
}

/** Moves the note's file into a git-ignored trash folder rather than deleting it. */
export function trashResearch(id: string, { root = contentRoot(), trashDir = defaultTrashDir(), expectedVersion }: StoreOptions = {}) {
  const current = readStoredResearch(root).find((entry) => entry.record.id === id);
  if (!current) throw new RecordNotFoundError(`No research note with ID ${id}`);
  checkVersion(current.record, expectedVersion);
  fs.mkdirSync(trashDir, { recursive: true });
  const destination = path.join(trashDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${current.file}`);
  const source = path.join(root, "research", current.file);
  try { fs.renameSync(source, destination); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    fs.copyFileSync(source, destination);
    fs.rmSync(source);
  }
  return { file: current.file, trashedTo: destination };
}

// A reorder is one atomic file replacement, never a series of individual note saves.
function collectionVersion(entries: StoredResearch[], ids: string[]) {
  return recordVersion({ ids, records: entries.map(entry => ({ id: entry.record.id, version: recordVersion(entry.record) })).sort((a, b) => a.id.localeCompare(b.id)) });
}
export function reorderResearch(input: unknown, { root = contentRoot(), expectedVersion }: StoreOptions = {}) {
  const existing = readStoredResearch(root);
  const previous = readResearchOrder(root);
  if (!expectedVersion || collectionVersion(existing, previous) !== expectedVersion) throw new VersionConflictError();
  const parsed = researchOrderSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(toIssues(parsed.error, input));
  const ids = parsed.data.ids;
  const expectedIds = new Set(existing.map(entry => entry.record.id));
  if (ids.length !== expectedIds.size || ids.some(id => !expectedIds.has(id))) {
    throw new ContentValidationError([{ path: 'ids', message: 'Include every current note exactly once. Reload the saved order before trying again.' }]);
  }
  writeJson(path.join(root, 'research-order.json'), { ids });
  return { ids, version: collectionVersion(existing, ids) };
}
