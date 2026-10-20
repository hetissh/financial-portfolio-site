// Accepts bounded Excel uploads and returns safe validation errors.
import { requireAdminRequestAsync, sameOrigin } from '@/lib/admin/auth';
import { MAX_WORKBOOK_BYTES } from '@/lib/admin/upload-limits';
import { UploadInputError, uploadErrorResponse } from '@/lib/admin/upload-errors';
import { workbookPreviewSchema } from '@/lib/workbook-preview';
import { storeCloudWorkbook } from '@/lib/supabase/uploads';
import { runtimeSetting } from '@/lib/runtime-env';
export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request) || request.headers.get('x-portfolio-admin') !== '1')
    return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    return Response.json({ message: 'Choose an Excel workbook.' }, { status: 415 });
  const maximum = MAX_WORKBOOK_BYTES + 16384;
  if (Number(request.headers.get('content-length')) > maximum)
    return Response.json({ message: 'Choose an .xlsx file up to 5 MB.' }, { status: 413 });
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
        return Response.json({ message: 'Choose an .xlsx file up to 5 MB.' }, { status: 413 });
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
      throw new UploadInputError('Choose a valid workbook upload.');
    }
    const file = form.get('file');
    if (!(file instanceof File)) throw new UploadInputError('Choose a workbook to upload.');
    if (
      file.type &&
      ![
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
        'application/zip',
      ].includes(file.type)
    )
      throw new UploadInputError('Choose an .xlsx workbook.');
    const bytes = Buffer.from(await file.arrayBuffer());
    let result;
    if (runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase') {
      let preview: unknown;
      try {
        preview = JSON.parse(String(form.get('preview')));
      } catch {
        throw new UploadInputError('Prepare the workbook preview in the browser and try again.');
      }
      const parsedPreview = workbookPreviewSchema.safeParse(preview);
      if (!parsedPreview.success)
        throw new UploadInputError('The workbook preview is invalid. Try uploading it again.');
      result = await storeCloudWorkbook(bytes, file.name, parsedPreview.data);
    } else {
      result = await (await import('@/lib/admin/workbooks')).storeWorkbook(bytes, file.name);
    }
    return Response.json(result, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return uploadErrorResponse(error, 'Unable to read workbook. Try again.');
  }
}
