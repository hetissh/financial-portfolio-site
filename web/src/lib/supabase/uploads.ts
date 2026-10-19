// Processes validated uploads in temporary space and persists their sources in Supabase Storage.
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { storeArticleImage, storeCoverImage } from '@/lib/admin/images';
import { storeWorkbook } from '@/lib/admin/workbooks';
import { validatePdf } from '@/lib/admin/resumes';
import { removePrivate, uploadPrivate } from './storage';

async function uploadFiles(files: { key: string; bytes: Buffer; contentType: string }[]) {
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
  bytes: Buffer,
  filename: string,
  crop: unknown,
  purpose: 'cover' | 'article',
  aspect = 1.55,
) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'portfolio-image-'));
  try {
    const result =
      purpose === 'article'
        ? await storeArticleImage(bytes, filename, crop, aspect, root)
        : await storeCoverImage(bytes, filename, crop, root);
    const directory = path.join(root, 'images');
    const id = result.id;
    await uploadFiles([
      {
        key: `images/${id}.original.webp`,
        bytes: fs.readFileSync(path.join(directory, `${id}.original.webp`)),
        contentType: 'image/webp',
      },
      {
        key: `images/${id}.webp`,
        bytes: fs.readFileSync(path.join(directory, `${id}.webp`)),
        contentType: 'image/webp',
      },
      {
        key: `images/${id}.json`,
        bytes: fs.readFileSync(path.join(directory, `${id}.json`)),
        contentType: 'application/json',
      },
    ]);
    return result;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function storeCloudWorkbook(bytes: Buffer, filename: string) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'portfolio-workbook-'));
  try {
    const result = await storeWorkbook(bytes, filename, root);
    const directory = path.join(root, 'workbooks');
    const id = result.attachment.id;
    await uploadFiles([
      {
        key: `workbooks/${id}.xlsx`,
        bytes: fs.readFileSync(path.join(directory, `${id}.xlsx`)),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      {
        key: `workbooks/${id}.json`,
        bytes: fs.readFileSync(path.join(directory, `${id}.json`)),
        contentType: 'application/json',
      },
    ]);
    return result;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function storeCloudPdf(
  bytes: Buffer,
  filename: string,
  kind: 'resume' | 'certification',
) {
  validatePdf(bytes, filename, kind === 'resume' ? 'PDF résumé' : 'certification PDF');
  const id = randomUUID();
  const folder = kind === 'resume' ? 'resumes' : 'certifications';
  const publicFolder = kind === 'resume' ? 'resumes' : 'certifications';
  await uploadPrivate(`${folder}/${id}.pdf`, bytes, 'application/pdf');
  return `/downloads/${publicFolder}/${id}.pdf`;
}
