// Keeps the Unsplash credential private and records compliant photo selections.
import { requireAdminRequestAsync, sameOrigin, smallJson } from '@/lib/admin/auth';

const apiRoot = 'https://api.unsplash.com';

export async function GET(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key)
    return Response.json(
      { message: 'Add UNSPLASH_ACCESS_KEY to web/.env.local to enable search.' },
      { status: 503 },
    );
  const query = new URL(request.url).searchParams.get('query')?.trim();
  if (!query || query.length > 100)
    return Response.json({ message: 'Enter a search of 1 to 100 characters.' }, { status: 400 });
  try {
    const url = new URL('/search/photos', apiRoot);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '12');
    url.searchParams.set('content_filter', 'high');
    url.searchParams.set('orientation', 'landscape');
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Unsplash search failed. Try again shortly.');
    const payload = (await response.json()) as {
      results?: Array<{
        id: string;
        alt_description?: string;
        urls: { small: string; regular: string };
        links: { html: string; download_location: string };
        user: { name: string; links: { html: string } };
      }>;
    };
    const results = (payload.results ?? []).map((photo) => ({
      id: photo.id,
      description: photo.alt_description ?? 'Unsplash photograph',
      imageUrl: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      photoUrl: photo.links.html,
      downloadLocation: photo.links.download_location,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
    }));
    return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { message: 'Could not search Unsplash. Try again shortly.' },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request) || request.headers.get('x-portfolio-admin') !== '1')
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key)
    return Response.json({ message: 'Unsplash search is not configured.' }, { status: 503 });
  try {
    const payload = await smallJson(request);
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('downloadLocation' in payload) ||
      typeof payload.downloadLocation !== 'string'
    )
      return Response.json({ message: 'Choose a valid Unsplash photo.' }, { status: 400 });
    let downloadUrl: URL;
    try {
      downloadUrl = new URL(payload.downloadLocation);
    } catch {
      return Response.json({ message: 'Choose a valid Unsplash photo.' }, { status: 400 });
    }
    if (
      downloadUrl.origin !== apiRoot ||
      !/^\/photos\/[\w-]+\/download$/.test(downloadUrl.pathname)
    )
      return Response.json({ message: 'Choose a valid Unsplash photo.' }, { status: 400 });
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Could not register photo selection. Try again.');
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { message: 'Could not register photo selection. Try again.' },
      { status: 502 },
    );
  }
}
