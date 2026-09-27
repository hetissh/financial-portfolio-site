import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { contentRoot } from '../content';
import { cropSchema } from '../content-schema';
import { cropRectangle } from '../image-crop';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
function imagePath(id: string, original: boolean, root: string) {
  if (!validId(id)) throw new Error('Invalid image');
  const sourceRoot = fs.realpathSync(root);
  const directory = fs.realpathSync(path.join(sourceRoot, 'images'));
  if (!directory.startsWith(sourceRoot + path.sep)) throw new Error('Invalid image directory');
  const file = fs.realpathSync(path.join(directory, `${id}${original ? '.original' : ''}.webp`));
  if (!file.startsWith(directory + path.sep) || !fs.statSync(file).isFile()) throw new Error('Invalid image');
  return file;
}
export function imageExists(id: string, root = contentRoot()) { try { imagePath(id, false, root); imagePath(id, true, root); return true; } catch { return false; } }
export function readCoverImage(id: string, original = false, root = contentRoot()) { return fs.readFileSync(imagePath(id, original, root)); }
export async function storeCoverImage(bytes: Buffer, filename: string, inputCrop: unknown, root = contentRoot()) {
  const crop = cropSchema.parse(inputCrop);
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !/\.(png|jpe?g|webp)$/i.test(filename)) throw new Error('Choose a JPEG, PNG or WebP image up to 10 MB.');
  let original: Buffer;
  try {
    const source = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
    const meta = await source.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1) throw new Error('Unsupported image');
    original = await source.rotate().webp({ quality: 92 }).toBuffer();
  } catch { throw new Error('Unable to read this image. Use a JPEG, PNG or WebP under 40 megapixels.'); }
  const meta = await sharp(original).metadata();
  const rect = cropRectangle(meta.width!, meta.height!, crop);
  const cropped = await sharp(original).extract(rect).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  const id = randomUUID(); const directory = path.join(root, 'images'); fs.mkdirSync(directory, { recursive: true });
  const files = [`${id}.original.webp`, `${id}.webp`, `${id}.json`];
  try {
    fs.writeFileSync(path.join(directory, files[0]), original, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, files[1]), cropped, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, files[2]), JSON.stringify({ crop, width: meta.width, height: meta.height, filename: path.basename(filename).slice(0, 150) }), { flag: 'wx' });
  } catch (error) { for (const file of files) fs.rmSync(path.join(directory, file), { force: true }); throw error; }
  return { id, crop };
}

// Article imports preserve their aspect ratio unless an optional crop was chosen.
export async function storeArticleImage(bytes: Buffer, filename: string, inputCrop?: unknown, aspect = 1.55, root = contentRoot()) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || !/\.(png|jpe?g|webp)$/i.test(filename)) throw new Error('Choose a JPEG, PNG or WebP image up to 10 MB.');
  let original: Buffer;
  try {
    const source = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
    const meta = await source.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1) throw new Error('Unsupported image');
    original = await source.rotate().webp({ quality: 92 }).toBuffer();
  } catch { throw new Error('Unable to read this image. Use a JPEG, PNG or WebP under 40 megapixels.'); }
  const meta = await sharp(original).metadata();
  if (meta.width! < 2 || meta.height! < 2) throw new Error('Choose an image at least 2 pixels wide and high.');
  const crop = inputCrop === undefined ? undefined : cropSchema.parse(inputCrop);
  const processing = sharp(original);
  if (crop) processing.extract(cropRectangle(meta.width!, meta.height!, crop, aspect));
  const { data, info } = await processing.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  const id = randomUUID(), directory = path.join(root, 'images'); fs.mkdirSync(directory, { recursive: true });
  const files = [`${id}.original.webp`, `${id}.webp`, `${id}.json`];
  try {
    fs.writeFileSync(path.join(directory, files[0]), original, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, files[1]), data, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, files[2]), JSON.stringify({ kind: 'article', crop, aspect, width: info.width, height: info.height }), { flag: 'wx' });
  } catch (error) { for (const file of files) fs.rmSync(path.join(directory, file), { force: true }); throw error; }
  return { id, width: info.width, height: info.height, src: `/images/articles/${id}.webp` };
}
