// Implements validated, versioned admin content operations against Supabase Postgres and Storage.
import { z } from 'zod';
import {
  parseResearch,
  profileSchema,
  researchSchema,
  sortResearch,
  type Profile,
  type Research,
} from '@/lib/content-schema';
import { researchOrderSchema } from '@/lib/research-order';
import { richImageIds } from '@/lib/rich-content';
import {
  ContentValidationError,
  RecordNotFoundError,
  VersionConflictError,
  recordVersion,
  type AdminResearch,
} from '@/lib/admin/store';
import { isManagedResume } from '@/lib/admin/resumes';
import { adminSupabase } from './client';
import { privateObjectExists, publicObjectExists } from './storage';

type ProfileRow = { id: number; body: unknown; version: number };
type ResearchRow = { id: string; slug: string; status: string; body: unknown; version: number };
type OrderRow = { id: number; note_ids: unknown; version: number };

function issues(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

async function rows() {
  const client = adminSupabase();
  const [profile, order] = await Promise.all([
    client.from('portfolio_profile').select('id,body,version').eq('id', 1).maybeSingle(),
    client.from('portfolio_research_order').select('id,note_ids,version').eq('id', 1).maybeSingle(),
  ]);
  if (profile.error || order.error || !profile.data)
    throw new Error('Unable to load cloud admin content.');
  const research: ResearchRow[] = [];
  for (let offset = 0; ; offset += 250) {
    const page = await client
      .from('portfolio_research')
      .select('id,slug,status,body,version')
      .order('id')
      .range(offset, offset + 249);
    if (page.error || !page.data) throw new Error('Unable to load cloud research.');
    research.push(...page.data);
    if (page.data.length < 250) break;
  }
  return {
    profile: profile.data as ProfileRow,
    order: order.data as OrderRow | null,
    research,
  };
}

function collectionVersion(research: Research[], order: string[]) {
  return recordVersion({
    ids: order,
    records: research
      .map((item) => ({ id: item.id, version: recordVersion(item) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export async function readCloudAdminContent() {
  const saved = await rows();
  const profile = profileSchema.parse(saved.profile.body);
  const research = parseResearch(saved.research.map((item) => item.body));
  const order = saved.order ? researchOrderSchema.parse({ ids: saved.order.note_ids }).ids : [];
  return {
    profile,
    profileVersion: recordVersion(profile),
    orderVersion: collectionVersion(research, order),
    research: sortResearch(
      research.map((item) => ({
        ...item,
        file: `${item.slug}.json`,
        version: recordVersion(item),
      })),
      order,
    ) as AdminResearch[],
  };
}

async function profileRow() {
  const result = await adminSupabase()
    .from('portfolio_profile')
    .select('id,body,version')
    .eq('id', 1)
    .maybeSingle();
  if (result.error || !result.data) throw new Error('Unable to load the cloud profile.');
  return result.data as ProfileRow;
}

async function validateProfileAssets(profile: Profile) {
  if (profile.resume) {
    const exists = isManagedResume(profile.resume)
      ? await privateObjectExists(`resumes/${profile.resume.split('/').at(-1)}`)
      : await publicObjectExists(profile.resume.slice(1));
    if (!exists)
      throw new ContentValidationError([{ path: 'resume', message: 'Upload this résumé again.' }]);
  }
  for (let index = 0; index < profile.certifications.length; index++) {
    const pdf = profile.certifications[index].pdf;
    if (pdf && !(await privateObjectExists(`certifications/${pdf.split('/').at(-1)}`)))
      throw new ContentValidationError([
        { path: `certifications.${index}.pdf`, message: 'Upload this PDF again.' },
      ]);
  }
}

export async function saveCloudProfile(input: unknown, expectedVersion: string) {
  const current = await profileRow();
  const previous = profileSchema.parse(current.body);
  if (recordVersion(previous) !== expectedVersion) throw new VersionConflictError();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(issues(parsed.error));
  await validateProfileAssets(parsed.data);
  const updated = await adminSupabase()
    .from('portfolio_profile')
    .update({
      body: parsed.data,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .eq('version', current.version)
    .select('version')
    .maybeSingle();
  if (updated.error) throw new Error('Unable to save cloud profile.');
  if (!updated.data) throw new VersionConflictError();
  return parsed.data;
}

async function validateResearchAssets(record: Research) {
  if (record.download && !(await publicObjectExists(record.download.slice(1))))
    throw new ContentValidationError([
      { path: 'download', message: 'Upload this download again.' },
    ]);
  if (
    record.cover?.type === 'image' &&
    record.cover.imageId &&
    !(await privateObjectExists(`images/${record.cover.imageId}.webp`))
  )
    throw new ContentValidationError([
      { path: 'cover.imageId', message: 'Import this image again.' },
    ]);
  for (const [index, section] of record.sections.entries())
    if (section.body)
      for (const id of richImageIds(section.body.doc))
        if (!(await privateObjectExists(`images/${id}.webp`)))
          throw new ContentValidationError([
            { path: `sections.${index}.body`, message: 'Import this image again.' },
          ]);
  for (const [index, attachment] of record.attachments.entries())
    if (
      attachment.kind === 'excel' &&
      !(await privateObjectExists(`workbooks/${attachment.id}.xlsx`))
    )
      throw new ContentValidationError([
        { path: `attachments.${index}.id`, message: 'Upload this workbook again.' },
      ]);
}

function parseResearchInput(input: unknown) {
  const parsed = researchSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(issues(parsed.error));
  return parsed.data;
}

async function nextId(research: Research[]) {
  const trash = await adminSupabase().from('portfolio_research_trash').select('note_id');
  if (trash.error) throw new Error('Unable to inspect research trash.');
  const numbers = [
    ...research.map((item) => item.id),
    ...(trash.data ?? []).map((item) => item.note_id),
  ]
    .map((id) => /^note-(\d+)$/.exec(id)?.[1])
    .filter((id): id is string => Boolean(id))
    .map(Number);
  return `note-${String(Math.max(0, ...numbers) + 1).padStart(2, '0')}`;
}

export async function createCloudResearch(input: unknown): Promise<AdminResearch> {
  const saved = await rows();
  const existing = parseResearch(saved.research.map((item) => item.body));
  const record = parseResearchInput({ ...(input as object), id: await nextId(existing) });
  if (existing.some((item) => item.slug === record.slug))
    throw new ContentValidationError([{ path: 'slug', message: 'Another note uses this slug.' }]);
  await validateResearchAssets(record);
  const result = await adminSupabase().from('portfolio_research').insert({
    id: record.id,
    slug: record.slug,
    status: record.status,
    body: record,
  });
  if (result.error) {
    if (result.error.code === '23505') throw new VersionConflictError();
    throw new Error('Unable to create cloud research.');
  }
  return { ...record, file: `${record.slug}.json`, version: recordVersion(record) };
}

export async function updateCloudResearch(
  id: string,
  input: unknown,
  expectedVersion: string,
): Promise<AdminResearch> {
  const client = adminSupabase();
  const current = await client
    .from('portfolio_research')
    .select('id,slug,status,body,version')
    .eq('id', id)
    .maybeSingle();
  if (current.error) throw new Error('Unable to load cloud research.');
  if (!current.data) throw new RecordNotFoundError(`No research note with ID ${id}`);
  const previous = researchSchema.parse(current.data.body);
  if (recordVersion(previous) !== expectedVersion) throw new VersionConflictError();
  const record = parseResearchInput({ ...(input as object), id });
  await validateResearchAssets(record);
  const updated = await client
    .from('portfolio_research')
    .update({
      slug: record.slug,
      status: record.status,
      body: record,
      version: current.data.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', current.data.version)
    .select('id')
    .maybeSingle();
  if (updated.error) {
    if (updated.error.code === '23505')
      throw new ContentValidationError([{ path: 'slug', message: 'Another note uses this slug.' }]);
    throw new Error('Unable to save cloud research.');
  }
  if (!updated.data) throw new VersionConflictError();
  return { ...record, file: `${record.slug}.json`, version: recordVersion(record) };
}

export async function trashCloudResearch(
  id: string,
  expectedVersion: string,
  removedBy: 'admin-1' | 'admin-2',
) {
  const client = adminSupabase();
  const current = await client
    .from('portfolio_research')
    .select('id,slug,body,version')
    .eq('id', id)
    .maybeSingle();
  if (current.error) throw new Error('Unable to inspect cloud research.');
  if (!current.data) throw new RecordNotFoundError(`No research note with ID ${id}`);
  const record = researchSchema.parse(current.data.body);
  if (recordVersion(record) !== expectedVersion) throw new VersionConflictError();
  const result = await client.rpc('portfolio_move_research_to_trash', {
    p_id: id,
    p_expected_version: current.data.version,
    p_removed_by: removedBy,
  });
  if (result.error) {
    if (result.error.message.includes('stale')) throw new VersionConflictError();
    throw new Error('Unable to move cloud research to trash.');
  }
  return { file: `${record.slug}.json`, trashedTo: 'Supabase trash' };
}

export async function reorderCloudResearch(input: unknown, expectedVersion: string) {
  const saved = await rows();
  const research = parseResearch(saved.research.map((item) => item.body));
  const previous = saved.order ? researchOrderSchema.parse({ ids: saved.order.note_ids }).ids : [];
  if (collectionVersion(research, previous) !== expectedVersion) throw new VersionConflictError();
  const parsed = researchOrderSchema.safeParse(input);
  if (!parsed.success) throw new ContentValidationError(issues(parsed.error));
  const expectedIds = new Set(research.map((item) => item.id));
  if (
    parsed.data.ids.length !== expectedIds.size ||
    parsed.data.ids.some((id) => !expectedIds.has(id))
  )
    throw new ContentValidationError([
      { path: 'ids', message: 'Include every current note exactly once. Reload first.' },
    ]);
  const updated = await adminSupabase()
    .from('portfolio_research_order')
    .update({
      note_ids: parsed.data.ids,
      version: (saved.order?.version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .eq('version', saved.order?.version ?? -1)
    .select('id')
    .maybeSingle();
  if (updated.error) throw new Error('Unable to save cloud research order.');
  if (!updated.data) throw new VersionConflictError();
  return { ids: parsed.data.ids, version: collectionVersion(research, parsed.data.ids) };
}
