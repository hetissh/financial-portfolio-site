// Serves cropped images referenced by visitor-visible notes; signed-in admins can preview drafts.
import { adminFromRequestAsync } from '@/lib/admin/auth';
import { adminContent } from '@/lib/admin/data-source';
import { readCoverImage } from '@/lib/admin/images';
import { loadPublicContent } from '@/lib/content';
import { richImageIds } from '@/lib/rich-content';
import { downloadPrivate } from '@/lib/supabase/storage';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const privateView =
    request.headers.get('sec-fetch-site') !== 'cross-site' &&
    Boolean(await adminFromRequestAsync(request));
  const notes = privateView
    ? (await adminContent()).research
    : (await loadPublicContent()).research;
  const referenced = notes.some(
    (note) =>
      (note.cover?.type === 'image' && note.cover.imageId === id) ||
      note.sections.some((section) => section.body && richImageIds(section.body.doc).includes(id)),
  );
  if (!referenced) return new Response('Not found', { status: 404 });
  try {
    const bytes =
      process.env.PORTFOLIO_DATA_SOURCE === 'supabase'
        ? await downloadPrivate(`images/${id}.webp`)
        : readCoverImage(id);
    if (!bytes) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
