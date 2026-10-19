// Serves downloads attached to visible notes; a session can preview a draft attachment.
import { adminFromRequestAsync } from '@/lib/admin/auth';
import { adminContent } from '@/lib/admin/data-source';
import { getWorkbook, readWorkbookFile } from '@/lib/admin/workbooks';
import { loadPublicContent } from '@/lib/content';
import { getCloudWorkbook } from '@/lib/supabase/workbooks';
import { downloadPrivate } from '@/lib/supabase/storage';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const privateView =
    request.headers.get('sec-fetch-site') !== 'cross-site' &&
    Boolean(await adminFromRequestAsync(request));
  const notes = privateView
    ? (await adminContent()).research
    : (await loadPublicContent()).research;
  if (
    !notes.some((note) =>
      note.attachments.some((attachment) => attachment.kind === 'excel' && attachment.id === id),
    )
  )
    return new Response('Not found', { status: 404 });
  const cloud = process.env.PORTFOLIO_DATA_SOURCE === 'supabase';
  const workbook = cloud ? await getCloudWorkbook(id) : getWorkbook(id);
  if (!workbook) return new Response('Not found', { status: 404 });
  const bytes = cloud ? await downloadPrivate(`workbooks/${id}.xlsx`) : readWorkbookFile(id);
  if (!bytes) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${workbook.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
