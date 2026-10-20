// Serves private image sources only to the local admin.
import { requireAdminRequestAsync } from '@/lib/admin/auth';
import { readCoverImage } from '@/lib/admin/images';
import { downloadPrivate } from '@/lib/supabase/storage';
import { runtimeSetting } from '@/lib/runtime-env';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return new Response('Cross-origin read blocked', { status: 403 });
  try {
    const { id } = await params;
    const original = new URL(request.url).searchParams.get('original') === '1';
    const bytes =
      runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase'
        ? await downloadPrivate(`images/${id}${original ? '.original' : ''}.webp`)
        : readCoverImage(id, original);
    if (!bytes) return new Response('Image not found', { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image not found', { status: 404 });
  }
}
