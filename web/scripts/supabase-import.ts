// Copies validated local content and source media into a fresh Supabase project.
// Reruns compare existing rows and objects, so a partial import can resume without
// replacing edits made later in the cloud admin.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { parseResearch, profileSchema } from '../src/lib/content-schema';
import { readProfileFile, readResearchFiles, readResearchOrder } from '../src/lib/content';

const root = process.cwd();
const contentRoot = path.join(root, 'src/content');
const profile = profileSchema.parse(readProfileFile(contentRoot));
const research = parseResearch(readResearchFiles(contentRoot).map((entry) => entry.data));
const order = readResearchOrder(contentRoot);
const apply = process.argv.includes('--apply');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

type Asset = { bucket: 'portfolio-private' | 'portfolio-public'; key: string; file: string };
const assets: Asset[] = [];
for (const folder of ['images', 'workbooks', 'resumes', 'certifications'] as const) {
  const directory = path.join(contentRoot, folder);
  if (!fs.existsSync(directory)) continue;
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isFile())
      assets.push({ bucket: 'portfolio-private', key: `${folder}/${name}`, file });
  }
}

const published = research.filter((note) => note.status === 'published');
// Managed media stays private; the visitor routes recheck visibility on each read.
for (const asset of [
  ...(!profile.isPlaceholder && profile.resume && !profile.resume.startsWith('/downloads/resumes/')
    ? [profile.resume]
    : []),
  ...research.flatMap((note) => (note.download ? [note.download] : [])),
]) {
  const file = path.join(root, 'public', asset.slice(1));
  assets.push({ bucket: 'portfolio-public', key: asset.slice(1), file });
}

for (const asset of assets)
  if (!fs.existsSync(asset.file) || !fs.statSync(asset.file).isFile())
    throw new Error(`A referenced asset is missing: ${asset.key}`);

console.log(
  `Local source: 1 profile, ${research.length} notes (${published.length} published), ${assets.length} media objects.`,
);
if (!apply) {
  console.log('Dry run only. Apply the SQL migration, then rerun with --apply to import.');
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function contentType(file: string) {
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (file.endsWith('.pdf')) return 'application/pdf';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  return 'application/json';
}

async function assertUnchanged(
  table: 'portfolio_profile' | 'portfolio_research' | 'portfolio_research_order',
  id: string | number,
  expected: unknown,
) {
  const column = table === 'portfolio_research_order' ? 'note_ids' : 'body';
  const result = await client.from(table).select(column).eq('id', id).maybeSingle();
  if (result.error) throw new Error(`Cannot inspect ${table}: ${result.error.message}`);
  if (result.data) {
    const actual =
      table === 'portfolio_research_order'
        ? (result.data as { note_ids: unknown }).note_ids
        : (result.data as { body: unknown }).body;
    if (canonical(actual) !== canonical(expected))
      throw new Error(
        `${table} already contains different content. Import stopped without overwriting it.`,
      );
  }
  return !result.data;
}

async function upload(asset: Asset) {
  const bytes = fs.readFileSync(asset.file);
  const bucket = client.storage.from(asset.bucket);
  const result = await bucket.upload(asset.key, bytes, {
    contentType: contentType(asset.file),
    upsert: false,
  });
  if (!result.error) return;
  const existing = await bucket.download(asset.key);
  if (
    existing.error ||
    !existing.data ||
    hash(bytes) !== hash(new Uint8Array(await existing.data.arrayBuffer()))
  )
    throw new Error(`Could not safely import ${asset.bucket}/${asset.key}.`);
}

const missingProfile = await assertUnchanged('portfolio_profile', 1, profile);
const missingOrder = await assertUnchanged('portfolio_research_order', 1, order);
const missingResearch = new Set<string>();
for (const note of research)
  if (await assertUnchanged('portfolio_research', note.id, note)) missingResearch.add(note.id);

for (const asset of assets) await upload(asset);

if (missingProfile) {
  const result = await client.from('portfolio_profile').insert({ id: 1, body: profile });
  if (result.error) throw new Error(`Profile import failed: ${result.error.message}`);
}
for (const note of research)
  if (missingResearch.has(note.id)) {
    const result = await client.from('portfolio_research').insert({
      id: note.id,
      slug: note.slug,
      status: note.status,
      body: note,
    });
    if (result.error)
      throw new Error(`Research import failed for ${note.id}: ${result.error.message}`);
  }
if (missingOrder) {
  const result = await client.from('portfolio_research_order').insert({ id: 1, note_ids: order });
  if (result.error) throw new Error(`Order import failed: ${result.error.message}`);
}
console.log('Supabase content import completed. Admin Auth users must still be invited and bound.');
