// Ends the current session and clears its browser cookie.
import {
  allowedAdminOrigin,
  cloudAdminEnabled,
  sameOrigin,
  sessionToken,
  SESSION_COOKIE,
} from '@/lib/admin/auth';
import { logOut } from '@/lib/admin/auth-store';
import { cloudLogOut } from '@/lib/supabase/admin-auth';
import { runtimeSetting } from '@/lib/runtime-env';

export async function POST(request: Request) {
  const origin = allowedAdminOrigin(request.headers.get('host'));
  if (!origin) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response('Cross-origin request blocked.', { status: 403 });
  if (cloudAdminEnabled()) await cloudLogOut(sessionToken(request));
  else logOut(sessionToken(request));
  // Response.redirect has immutable headers; use the validated Host because Next may rewrite request.url.
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL('/', origin).toString(),
      'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${runtimeSetting('ADMIN_ORIGIN')?.startsWith('https://') ? '; Secure' : ''}`,
    },
  });
}
