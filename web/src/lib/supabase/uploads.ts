// Stores processed cloud uploads directly, without local disk or native image tools.
import { randomUUID } from 'node:crypto';
import { cropSchema } from '@/lib/content-schema';
import { UploadInputError } from '@/lib/admin/upload-errors';
import { validatePdf } from '@/lib/admin/pdf-upload';
import { validateWorkbookArchive, workbookFilename } from '@/lib/workbook-archive.mjs';
import { workbookPreviewSchema } from '@/lib/workbook-preview';
import { MAX_WORKBOOK_BYTES } from '@/lib/admin/upload-limits';
import { removePrivate, uploadPrivate } from './storage';

async function uploadFiles(files: { key: string; bytes: Uint8Array; contentType: string }[]) {
  const completed: string[] = [];
  try {
    for (const file of files) {
      await uploadPrivate(file.key, file.bytes, file.contentType);
      completed.push(file.key);
    }
  } catch (error) {
    try {
      await removePrivate(completed);
    } catch (cleanupError) {
      console.error('Incomplete cloud upload cleanup failed', cleanupError);
    }
    throw error;
  }
}

export async function storeCloudImage(
  original: Uint8Array,
  cropped: Uint8Array,
  filename: string,
  crop: unknown,
  purpose: 'cover' | 'article',
  aspect = 1.55,
  dimensions: { width: number; height: number },
) {
  const parsed = cropSchema.safeParse(crop);
  if (!parsed.success) throw new UploadInputError('Choose a valid image crop.');
  if (
    original.length < 12 ||
    original.length > 20 * 1024 * 1024 ||
    cropped.length < 12 ||
    cropped.length > 10 * 1024 * 1024 ||
    !isWebp(original) ||
    !isWebp(cropped) ||
    !/\.(png|jpe?g|webp)$/i.test(filename) ||
    ![dimensions.width, dimensions.height].every(Number.isInteger) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > 1600 ||
    dimensions.height > 1600
  )
    throw new UploadInputError('Choose a valid image crop.');
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect > 20_000_000)
    throw new UploadInputError('Choose a valid image crop.');
  const id = randomUUID();
  const safeName = filename.replace(/[\\/]/g, '_').slice(0, 150);
  const metadata = new TextEncoder().encode(
    JSON.stringify({
      kind: purpose === 'article' ? 'article' : undefined,
      crop: parsed.data,
      aspect: purpose === 'article' ? aspect : undefined,
      width: dimensions.width,
      height: dimensions.height,
      filename: safeName,
    }),
  );
  await uploadFiles([
    { key: `images/${id}.original.webp`, bytes: original, contentType: 'image/webp' },
    { key: `images/${id}.webp`, bytes: cropped, contentType: 'image/webp' },
    { key: `images/${id}.json`, bytes: metadata, contentType: 'application/json' },
  ]);
  return purpose === 'article'
    ? { id, width: dimensions.width, height: dimensions.height, src: `/images/articles/${id}.webp` }
    : { id, crop: parsed.data };
}

export async function storeCloudWorkbook(bytes: Buffer, filename: string, inputPreview: unknown) {
  if (!bytes.length || bytes.length > MAX_WORKBOOK_BYTES || !/\.xlsx$/i.test(filename))
    throw new UploadInputError('Choose an .xlsx file up to 5 MB.');
  let preview;
  try {
    validateWorkbookArchive(bytes);
    preview = workbookPreviewSchema.parse(inputPreview);
  } catch (error) {
    if (error instanceof UploadInputError) throw error;
    throw new UploadInputError('Unable to read this workbook. Check the file and try again.');
  }
  const id = randomUUID();
  const safeFilename = workbookFilename(filename);
  const metadata = new TextEncoder().encode(JSON.stringify({ filename: safeFilename, preview }));
  await uploadFiles([
    {
      key: `workbooks/${id}.xlsx`,
      bytes,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    { key: `workbooks/${id}.json`, bytes: metadata, contentType: 'application/json' },
  ]);
  return {
    attachment: {
      kind: 'excel' as const,
      id,
      label: filename.replace(/\.xlsx$/i, '').slice(0, 120),
    },
    preview,
  };
}

export async function storeCloudPdf(
  bytes: Buffer,
  filename: string,
  kind: 'resume' | 'certification',
) {
  validatePdf(bytes, filename, kind === 'resume' ? 'PDF résumé' : 'certification PDF');
  const id = randomUUID();
  const folder = kind === 'resume' ? 'resumes' : 'certifications';
  await uploadPrivate(`${folder}/${id}.pdf`, bytes, 'application/pdf');
  return `/downloads/${folder}/${id}.pdf`;
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}
