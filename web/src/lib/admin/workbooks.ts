// Validates Excel uploads and stores private workbook previews and sources.
import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { contentRoot } from '../content';
import { workbookPreviewSchema, type WorkbookPreview } from '../workbook-preview';
import { UploadInputError } from './upload-errors';
import { MAX_WORKBOOK_BYTES } from './upload-limits';
export { MAX_WORKBOOK_BYTES } from './upload-limits';
export type { WorkbookPreview } from '../workbook-preview';
const workbookMetadataSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[\w. ()-]+$/),
  preview: workbookPreviewSchema,
});
const validId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
// Only messages from this allowlist can cross the worker boundary to the browser.
const workbookInputMessages = new Set([
  'Upload a valid .xlsx workbook.',
  'This archive format is not supported.',
  'Workbook archive is too complex.',
  'Workbook archive is damaged.',
  'Workbook is encrypted, damaged, or too large to preview.',
  'Remove macros and external workbook links before uploading.',
  'Invalid workbook archive path.',
  'Upload an .xlsx workbook.',
  'This workbook has no visible sheets.',
]);
export function workbookDirectory(root = contentRoot()) {
  return path.join(root, 'workbooks');
}
export async function parseWorkbook(buffer: Buffer): Promise<WorkbookPreview> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), 'scripts/parse-workbook.mjs'), {
      workerData: { bytes: buffer },
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new UploadInputError('Workbook took too long to read. Try a smaller workbook.'));
    }, 8000);
    worker.once('message', (result: unknown) => {
      clearTimeout(timer);
      void worker.terminate();
      const message =
        result && typeof result === 'object' && 'error' in result ? result.error : null;
      if (typeof message === 'string')
        reject(
          new UploadInputError(
            workbookInputMessages.has(message)
              ? message
              : 'Unable to read this workbook. Check the file and try again.',
          ),
        );
      else {
        const preview = workbookPreviewSchema.safeParse(
          result && typeof result === 'object' && 'preview' in result ? result.preview : undefined,
        );
        if (preview.success) resolve(preview.data);
        else
          reject(
            new UploadInputError('Unable to read this workbook. Check the file and try again.'),
          );
      }
    });
    worker.once('error', () => {
      clearTimeout(timer);
      reject(new UploadInputError('Workbook could not be read within the preview limits.'));
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0)
        reject(new UploadInputError('Workbook preview stopped. Try a smaller workbook.'));
    });
  });
}
export async function storeWorkbook(buffer: Buffer, filename: string, root = contentRoot()) {
  if (!buffer.length || buffer.length > MAX_WORKBOOK_BYTES || !/\.xlsx$/i.test(filename))
    throw new UploadInputError('Choose an .xlsx file up to 5 MB.');
  const preview = await parseWorkbook(buffer);
  const id = randomUUID();
  const directory = workbookDirectory(root);
  fs.mkdirSync(directory, { recursive: true });
  // Metadata failure must not leave a workbook source with no preview record.
  const created: string[] = [];
  try {
    fs.writeFileSync(path.join(directory, `${id}.xlsx`), buffer, { flag: 'wx' });
    created.push(`${id}.xlsx`);
    fs.writeFileSync(
      path.join(directory, `${id}.json`),
      JSON.stringify({ filename: filename.replace(/[^\w. ()-]/g, '_').slice(0, 150), preview }),
      { flag: 'wx' },
    );
    created.push(`${id}.json`);
  } catch (error) {
    for (const file of created) fs.rmSync(path.join(directory, file), { force: true });
    throw error;
  }
  return {
    attachment: {
      kind: 'excel' as const,
      id,
      label: filename.replace(/\.xlsx$/i, '').slice(0, 120),
    },
    preview,
  };
}
export function getWorkbook(
  id: string,
  root = contentRoot(),
): { filename: string; preview: WorkbookPreview } | null {
  if (!validId(id)) return null;
  try {
    const parsed = workbookMetadataSchema.safeParse(
      JSON.parse(fs.readFileSync(path.join(workbookDirectory(root), `${id}.json`), 'utf8')),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function workbookExists(id: string, root = contentRoot()) {
  if (!validId(id)) return false;
  try {
    return (
      Boolean(getWorkbook(id, root)) &&
      fs.statSync(path.join(workbookDirectory(root), `${id}.xlsx`)).isFile()
    );
  } catch {
    return false;
  }
}
export function readWorkbookFile(id: string, root = contentRoot()) {
  if (!validId(id)) throw new Error('Invalid workbook');
  return fs.readFileSync(path.join(workbookDirectory(root), `${id}.xlsx`));
}
