import { adminEnabled, isLocalHost } from '@/lib/admin/guard';
import { MAX_WORKBOOK_BYTES, storeWorkbook } from '@/lib/admin/workbooks';
export async function POST(request: Request) {
  if (!adminEnabled()) return Response.json({ message: 'Not found' }, { status: 404 });
  const host = request.headers.get('host');
  if (!isLocalHost(host) || request.headers.get('origin') !== `http://${host}` || request.headers.get('x-portfolio-admin') !== '1') return Response.json({ message: 'Cross-origin upload blocked.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return Response.json({ message: 'Choose an Excel workbook.' }, { status: 415 });
  const maximum = MAX_WORKBOOK_BYTES + 16384;
  if (Number(request.headers.get('content-length')) > maximum) return Response.json({ message: 'Choose an .xlsx file up to 5 MB.' }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: 'No file uploaded.' }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); return Response.json({ message: 'Choose an .xlsx file up to 5 MB.' }, { status: 413 }); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  try {
    const form = await new Request('http://localhost', { method: 'POST', headers: { 'content-type': request.headers.get('content-type')! }, body: new Uint8Array(Buffer.concat(chunks)) }).formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Choose a workbook to upload.');
    if (file.type && !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'application/zip'].includes(file.type)) throw new Error('Choose an .xlsx workbook.');
    return Response.json(await storeWorkbook(Buffer.from(await file.arrayBuffer()), file.name), { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Unable to read workbook.' }, { status: 400 }); }
}
