// Serves private workbook sources only to the local admin.
import { requireAdminRequestAsync } from '@/lib/admin/auth';
import { getWorkbook, readWorkbookFile } from '@/lib/admin/workbooks';
import { getCloudWorkbook } from '@/lib/supabase/workbooks';
import { downloadPrivate } from '@/lib/supabase/storage';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return new Response('Cross-origin read blocked', { status: 403 });
  const { id } = await params;
  const cloud = process.env.PORTFOLIO_DATA_SOURCE === 'supabase';
  const book = cloud ? await getCloudWorkbook(id) : getWorkbook(id);
  if (!book) return new Response('Not found', { status: 404 });
  if (new URL(request.url).searchParams.get('preview') === '1')
    return Response.json(book.preview, { headers: { 'Cache-Control': 'no-store' } });
  const bytes = cloud ? await downloadPrivate(`workbooks/${id}.xlsx`) : readWorkbookFile(id);
  if (!bytes) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${book.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
