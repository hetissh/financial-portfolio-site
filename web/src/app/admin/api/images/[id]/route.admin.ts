import { adminEnabled, isLocalHost } from '@/lib/admin/guard';
import { readCoverImage } from '@/lib/admin/images';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!adminEnabled() || !isLocalHost(request.headers.get('host'))) return new Response('Not found', { status: 404 });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Cross-origin read blocked', { status: 403 });
  try { const { id } = await params; return new Response(new Uint8Array(readCoverImage(id, new URL(request.url).searchParams.get('original') === '1')), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
  catch { return new Response('Image not found', { status: 404 }); }
}
