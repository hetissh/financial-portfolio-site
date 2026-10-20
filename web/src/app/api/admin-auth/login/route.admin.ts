// Exchanges a fixed admin account's password for a revocable server-side session.
import { z } from 'zod';
import {
  allowedAdminOrigin,
  cloudAdminEnabled,
  sameOrigin,
  smallJson,
  SESSION_COOKIE,
} from '@/lib/admin/auth';
import { logIn } from '@/lib/admin/auth-store';
import { cloudLogIn } from '@/lib/supabase/admin-auth';
import { runtimeSetting } from '@/lib/runtime-env';

const schema = z.object({ email: z.email(), password: z.string().min(1).max(256) });
export async function POST(request: Request) {
  if (!allowedAdminOrigin(request.headers.get('host'))) return new Response(null, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const data = schema.safeParse(await smallJson(request));
  if (!data.success)
    return Response.json({ message: 'Enter your email and password.' }, { status: 400 });
  try {
    const token = cloudAdminEnabled()
      ? await cloudLogIn(data.data.email, data.data.password)
      : logIn(data.data.email, data.data.password);
    if (!token)
      return Response.json(
        { message: 'Email or password is incorrect, or sign-in is temporarily limited.' },
        { status: 401 },
      );
    const response = Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${runtimeSetting('ADMIN_ORIGIN')?.startsWith('https://') ? '; Secure' : ''}`,
    );
    return response;
  } catch (error) {
    console.error('Admin login unavailable', error);
    return Response.json(
      { message: 'Sign-in is unavailable. Contact the site operator.' },
      { status: 503 },
    );
  }
}
