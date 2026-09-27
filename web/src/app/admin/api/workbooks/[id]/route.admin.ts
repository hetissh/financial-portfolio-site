import { adminEnabled, isLocalHost } from '@/lib/admin/guard';
import { getWorkbook, readWorkbookFile } from '@/lib/admin/workbooks';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminEnabled() || !isLocalHost(request.headers.get('host'))) return new Response('Not found', { status: 404 });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Cross-origin read blocked', { status: 403 });
  const { id } = await params; const book = getWorkbook(id);
  if (!book) return new Response('Not found', { status: 404 });
  if (new URL(request.url).searchParams.get('preview') === '1') return Response.json(book.preview, { headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(readWorkbookFile(id)), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${book.filename}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
