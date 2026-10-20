// Accepts and previews private certification PDFs for the authenticated profile editor.
import { requireAdminRequestAsync, sameOrigin } from '@/lib/admin/auth';
import { MAX_RESUME_BYTES } from '@/lib/admin/resumes';
import {
  isManagedCertification,
  readCertification,
  storeCertification,
} from '@/lib/admin/certifications';
import { contentRoot } from '@/lib/content';
import { UploadInputError, uploadErrorResponse } from '@/lib/admin/upload-errors';
import { storeCloudPdf } from '@/lib/supabase/uploads';
import { downloadPrivate } from '@/lib/supabase/storage';
import { runtimeSetting } from '@/lib/runtime-env';

export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request) || request.headers.get('x-portfolio-admin') !== '1')
    return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    return Response.json({ message: 'Choose a certification PDF.' }, { status: 415 });

  const maximum = MAX_RESUME_BYTES + 16384;
  const tooLarge = () =>
    Response.json({ message: 'Choose a certification PDF up to 5 MB.' }, { status: 413 });
  if (Number(request.headers.get('content-length')) > maximum) return tooLarge();
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
      throw new UploadInputError('Choose a valid certification PDF.');
    }
    const file = form.get('file');
    if (!(file instanceof File) || (file.type && file.type !== 'application/pdf'))
      throw new UploadInputError('Choose a certification PDF.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdf =
      runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase'
        ? await storeCloudPdf(bytes, file.name, 'certification')
        : storeCertification(bytes, file.name, contentRoot());
    return Response.json({ pdf }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return uploadErrorResponse(error, 'Unable to upload certification PDF. Try again.');
  }
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return new Response('Cross-origin read blocked', { status: 403 });
  const asset = new URL(request.url).searchParams.get('path');
  if (!asset || !isManagedCertification(asset))
    return Response.json({ message: 'Certification PDF not found.' }, { status: 404 });
  try {
    const bytes =
      runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase'
        ? await downloadPrivate(`certifications/${asset.split('/').at(-1)}`)
        : readCertification(asset, contentRoot());
    if (!bytes) return Response.json({ message: 'Certification PDF not found.' }, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="certification.pdf"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json({ message: 'Certification PDF not found.' }, { status: 404 });
  }
}
