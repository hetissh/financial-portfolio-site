// Accepts bounded local image uploads and returns safe validation errors.
import { requireAdminRequestAsync, sameOrigin } from '@/lib/admin/auth';
import { MAX_IMAGE_BYTES } from '@/lib/admin/upload-limits';
import { UploadInputError, uploadErrorResponse } from '@/lib/admin/upload-errors';
import { storeCloudImage } from '@/lib/supabase/uploads';
import { runtimeSetting } from '@/lib/runtime-env';
function cropValue(value: FormDataEntryValue | null) {
  try {
    return JSON.parse(String(value));
  } catch {
    throw new UploadInputError('Choose a valid image crop.');
  }
}
export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request) || request.headers.get('x-portfolio-admin') !== '1')
    return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    return Response.json({ message: 'Choose an image.' }, { status: 415 });
  // The raw file plus normalized original and crop can exceed the raw-file limit.
  const maximum = MAX_IMAGE_BYTES * 4 + 65536;
  const tooLarge = () => Response.json({ message: 'Image upload is too large.' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > maximum) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: 'No image uploaded.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        return tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    let form: FormData;
    try {
      form = await new Request('http://localhost', {
        method: 'POST',
        headers: { 'content-type': request.headers.get('content-type')! },
        body: new Uint8Array(Buffer.concat(chunks)),
      }).formData();
    } catch {
      throw new UploadInputError('Choose a valid image upload.');
    }
    const file = form.get('file');
    if (!(file instanceof File)) throw new UploadInputError('Choose an image to upload.');
    const purpose = form.get('purpose');
    if (purpose !== null && purpose !== 'article')
      throw new UploadInputError('Choose a valid image upload.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const crop = form.has('crop') ? cropValue(form.get('crop')) : undefined;
    const aspect = form.has('aspect') ? Number(form.get('aspect')) : 1.55;
    let result;
    if (runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase') {
      const original = form.get('original');
      const processed = form.get('processed');
      if (!(original instanceof File) || !(processed instanceof File))
        throw new UploadInputError('Prepare the image in the browser and try again.');
      result = await storeCloudImage(
        new Uint8Array(await original.arrayBuffer()),
        new Uint8Array(await processed.arrayBuffer()),
        file.name,
        crop,
        purpose === 'article' ? 'article' : 'cover',
        aspect,
        { width: Number(form.get('processedWidth')), height: Number(form.get('processedHeight')) },
      );
    } else {
      const { storeArticleImage, storeCoverImage } = await import('@/lib/admin/images');
      result =
        purpose === 'article'
          ? await storeArticleImage(bytes, file.name, crop, aspect)
          : await storeCoverImage(bytes, file.name, crop);
    }
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return uploadErrorResponse(error, 'Unable to import image. Try again.');
  }
}
