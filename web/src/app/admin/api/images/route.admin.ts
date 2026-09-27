import { adminEnabled, isLocalHost } from '@/lib/admin/guard';
import { MAX_IMAGE_BYTES, storeCoverImage, storeArticleImage } from '@/lib/admin/images';
export async function POST(request: Request) {
  if (!adminEnabled()) return Response.json({ message: 'Not found' }, { status: 404 });
  const host = request.headers.get('host');
  if (!isLocalHost(host) || request.headers.get('origin') !== `http://${host}` || request.headers.get('x-portfolio-admin') !== '1') return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return Response.json({ message: 'Choose an image.' }, { status: 415 });
  const maximum = MAX_IMAGE_BYTES + 16384;
  const tooLarge = () => Response.json({ message: 'Choose an image up to 10 MB.' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > maximum) return tooLarge();
  const reader = request.body?.getReader(); if (!reader) return Response.json({ message: 'No image uploaded.' }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); return tooLarge(); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try {
    const form = await new Request('http://localhost', { method: 'POST', headers: { 'content-type': request.headers.get('content-type')! }, body: new Uint8Array(Buffer.concat(chunks)) }).formData();
    const file = form.get('file'); if (!(file instanceof File)) throw new Error('Choose an image to upload.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = form.get('purpose') === 'article' ? await storeArticleImage(bytes, file.name, form.has('crop') ? JSON.parse(String(form.get('crop'))) : undefined, form.has('aspect') ? Number(form.get('aspect')) : 1.55) : await storeCoverImage(bytes, file.name, JSON.parse(String(form.get('crop'))));
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Unable to import image.' }, { status: 400 }); }
}
