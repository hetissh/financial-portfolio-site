// Keeps uploaded PDFs private until the saved profile selects one for publication.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UploadInputError } from './upload-errors';
import type { Profile } from '../content-schema';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export function validatePdf(buffer: Buffer, filename: string, label = 'PDF') {
  if (
    !/\.pdf$/i.test(filename) ||
    buffer.length < 8 ||
    buffer.length > MAX_RESUME_BYTES ||
    !buffer.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
    !buffer.subarray(Math.max(0, buffer.length - 2048)).includes(Buffer.from('%%EOF'))
  )
    throw new UploadInputError(`Choose a valid ${label} up to 5 MB.`);
}
const managedResume =
  /^\/downloads\/resumes\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.pdf$/;

export function isManagedResume(asset: string) {
  return managedResume.test(asset);
}

function sourceFile(asset: string, root: string) {
  const id = managedResume.exec(asset)?.[1];
  if (!id) throw new UploadInputError('Invalid uploaded résumé path.');
  return path.join(root, 'resumes', `${id}.pdf`);
}

export function resumeExists(asset: string, root: string) {
  try {
    return fs.statSync(sourceFile(asset, root)).isFile();
  } catch {
    return false;
  }
}

export function readResume(asset: string, root: string) {
  return fs.readFileSync(sourceFile(asset, root));
}

export function storeResume(buffer: Buffer, filename: string, root: string) {
  validatePdf(buffer, filename, 'PDF résumé');

  const directory = path.join(root, 'resumes');
  fs.mkdirSync(directory, { recursive: true });
  const name = `${randomUUID()}.pdf`;
  fs.writeFileSync(path.join(directory, name), buffer, { flag: 'wx', mode: 0o600 });
  return `/downloads/resumes/${name}`;
}

// This directory is generator-owned. Never delete manual PDFs elsewhere in public/.
export function syncPublishedResume(
  profile: Profile,
  root: string,
  publicRoot = path.join(process.cwd(), 'public'),
) {
  const directory = path.join(publicRoot, 'downloads', 'resumes');
  fs.mkdirSync(directory, { recursive: true });
  const selected =
    profile.resumeVisible && profile.resume && isManagedResume(profile.resume)
      ? path.basename(profile.resume)
      : undefined;
  if (selected) {
    const bytes = readResume(profile.resume!, root);
    const temporary = path.join(directory, `${selected}.tmp`);
    fs.writeFileSync(temporary, bytes, { flag: 'w', mode: 0o644 });
    fs.renameSync(temporary, path.join(directory, selected));
  }
  for (const name of fs.readdirSync(directory))
    if (isManagedResume(`/downloads/resumes/${name}`) && name !== selected)
      fs.unlinkSync(path.join(directory, name));
  return selected ? `/downloads/resumes/${selected}` : undefined;
}
