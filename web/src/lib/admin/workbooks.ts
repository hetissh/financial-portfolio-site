import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { contentRoot } from '../content';
export type WorkbookPreview = { sheets: { name: string; rows: { value: string; formula?: string }[][]; rowCount: number; columnCount: number; truncated: boolean }[]; sheetsTruncated: boolean };
export const MAX_WORKBOOK_BYTES = 5 * 1024 * 1024;
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export function workbookDirectory(root = contentRoot()) { return path.join(root, 'workbooks'); }
export async function parseWorkbook(buffer: Buffer): Promise<WorkbookPreview> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), 'scripts/parse-workbook.mjs'), { workerData: { bytes: buffer }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Workbook took too long to read. Try a smaller workbook.')); }, 8000);
    worker.once('message', result => { clearTimeout(timer); void worker.terminate(); if (result.error) reject(new Error(result.error)); else resolve(result.preview); });
    worker.once('error', () => { clearTimeout(timer); reject(new Error('Workbook could not be read within the preview limits.')); });
    worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new Error('Workbook preview stopped. Try a smaller workbook.')); });
  });
}
export async function storeWorkbook(buffer: Buffer, filename: string, root = contentRoot()) {
  if (!buffer.length || buffer.length > MAX_WORKBOOK_BYTES || !/\.xlsx$/i.test(filename)) throw new Error('Choose an .xlsx file up to 5 MB.');
  const preview = await parseWorkbook(buffer);
  const id = randomUUID(); const directory = workbookDirectory(root);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, `${id}.xlsx`), buffer, { flag: 'wx' });
  fs.writeFileSync(path.join(directory, `${id}.json`), JSON.stringify({ filename: filename.replace(/[^\w. ()-]/g, '_').slice(0, 150), preview }), { flag: 'wx' });
  return { attachment: { kind: 'excel' as const, id, label: filename.replace(/\.xlsx$/i, '').slice(0, 120) }, preview };
}
export function getWorkbook(id: string, root = contentRoot()): { filename: string; preview: WorkbookPreview } | null {
  if (!validId(id)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(workbookDirectory(root), `${id}.json`), 'utf8')); } catch { return null; }
}
export function workbookExists(id: string, root = contentRoot()) {
  if (!validId(id)) return false;
  try { return Boolean(getWorkbook(id, root)) && fs.statSync(path.join(workbookDirectory(root), `${id}.xlsx`)).isFile(); } catch { return false; }
}
export function readWorkbookFile(id: string, root = contentRoot()) { if (!validId(id)) throw new Error('Invalid workbook'); return fs.readFileSync(path.join(workbookDirectory(root), `${id}.xlsx`)); }
