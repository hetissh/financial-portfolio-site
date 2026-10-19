// Tells the static public shell whether this browser has an active admin session.
import { adminFromRequestAsync } from '@/lib/admin/auth';
export async function GET(request: Request) {
  return new Response(null, {
    status: (await adminFromRequestAsync(request)) ? 204 : 401,
    headers: { 'Cache-Control': 'no-store' },
  });
}
