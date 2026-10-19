// Keeps uploaded certification PDFs private until a visible profile entry publishes them.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Profile } from '../content-schema';
import { UploadInputError } from './upload-errors';
import { validatePdf } from './resumes';

const managedCertification =
  /^\/downloads\/certifications\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.pdf$/;

export function isManagedCertification(asset: string) {
  return managedCertification.test(asset);
}

function sourceFile(asset: string, root: string) {
  const id = managedCertification.exec(asset)?.[1];
  if (!id) throw new UploadInputError('Invalid certification PDF path.');
  return path.join(root, 'certifications', `${id}.pdf`);
}

export function certificationExists(asset: string, root: string) {
  try {
    return fs.statSync(sourceFile(asset, root)).isFile();
  } catch {
    return false;
  }
}

export function readCertification(asset: string, root: string) {
  return fs.readFileSync(sourceFile(asset, root));
}

export function storeCertification(buffer: Buffer, filename: string, root: string) {
  validatePdf(buffer, filename, 'certification PDF');
  const directory = path.join(root, 'certifications');
  fs.mkdirSync(directory, { recursive: true });
  const name = `${randomUUID()}.pdf`;
  fs.writeFileSync(path.join(directory, name), buffer, { flag: 'wx', mode: 0o600 });
  return `/downloads/certifications/${name}`;
}

// The generated public directory contains only PDFs selected by visible entries.
export function syncPublishedCertifications(
  profile: Profile,
  root: string,
  publicRoot = path.join(process.cwd(), 'public'),
) {
  const directory = path.join(publicRoot, 'downloads', 'certifications');
  fs.mkdirSync(directory, { recursive: true });
  const selected = new Set(
    profile.certifications
      .filter((item) => item.visible && item.pdf)
      .map((item) => path.basename(item.pdf!)),
  );
  for (const name of selected) {
    const asset = `/downloads/certifications/${name}`;
    const temporary = path.join(directory, `${name}.tmp`);
    fs.writeFileSync(temporary, readCertification(asset, root), { flag: 'w', mode: 0o644 });
    fs.renameSync(temporary, path.join(directory, name));
  }
  for (const name of fs.readdirSync(directory))
    if (isManagedCertification(`/downloads/certifications/${name}`) && !selected.has(name))
      fs.unlinkSync(path.join(directory, name));
  return selected.size;
}
