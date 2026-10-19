// Receives authenticated, bounded PDF résumé uploads for the profile editor.
import { requireAdminRequestAsync, sameOrigin } from '@/lib/admin/auth';
import { MAX_RESUME_BYTES, isManagedResume, readResume, storeResume } from '@/lib/admin/resumes';
import { contentRoot } from '@/lib/content';
import { UploadInputError, uploadErrorResponse } from '@/lib/admin/upload-errors';
import { storeCloudPdf } from '@/lib/supabase/uploads';
import { downloadPrivate } from '@/lib/supabase/storage';

export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request) || request.headers.get('x-portfolio-admin') !== '1')
    return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    return Response.json({ message: 'Choose a PDF résumé.' }, { status: 415 });

  const maximum = MAX_RESUME_BYTES + 16384;
  if (Number(request.headers.get('content-length')) > maximum)
    return Response.json({ message: 'Choose a PDF résumé up to 5 MB.' }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: 'No file uploaded.' }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        return Response.json({ message: 'Choose a PDF résumé up to 5 MB.' }, { status: 413 });
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
      throw new UploadInputError('Choose a valid PDF upload.');
    }
    const file = form.get('file');
    if (!(file instanceof File) || (file.type && file.type !== 'application/pdf'))
      throw new UploadInputError('Choose a PDF résumé.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const resume =
      process.env.PORTFOLIO_DATA_SOURCE === 'supabase'
        ? await storeCloudPdf(bytes, file.name, 'resume')
        : storeResume(bytes, file.name, contentRoot());
    return Response.json({ resume }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return uploadErrorResponse(error, 'Unable to upload résumé. Try again.');
  }
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  const asset = new URL(request.url).searchParams.get('path');
  if (!asset || !isManagedResume(asset))
    return Response.json({ message: 'Résumé not found.' }, { status: 404 });
  try {
    const bytes =
      process.env.PORTFOLIO_DATA_SOURCE === 'supabase'
        ? await downloadPrivate(`resumes/${asset.split('/').at(-1)}`)
        : readResume(asset, contentRoot());
    if (!bytes) return Response.json({ message: 'Résumé not found.' }, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ message: 'Résumé not found.' }, { status: 404 });
  }
}
