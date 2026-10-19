// Consumes a one-time recovery token, updates the hash, and revokes old sessions.
import { z } from 'zod';
import { allowedAdminOrigin, cloudAdminEnabled, sameOrigin, smallJson } from '@/lib/admin/auth';
import { AuthInputError, resetPassword } from '@/lib/admin/auth-store';
import { cloudResetPassword } from '@/lib/supabase/admin-auth';

export async function POST(request: Request) {
  if (!allowedAdminOrigin(request.headers.get('host'))) return new Response(null, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const parsed = z
    .object({
      token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      password: z.string().min(12).max(256),
    })
    .safeParse(await smallJson(request));
  if (!parsed.success)
    return Response.json(
      { message: 'Use a valid reset link and a password of at least 12 characters.' },
      { status: 400 },
    );
  try {
    if (cloudAdminEnabled()) await cloudResetPassword(parsed.data.token, parsed.data.password);
    else resetPassword(parsed.data.token, parsed.data.password);
    return Response.json(
      { message: 'Password reset. Sign in with your new password.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof AuthInputError)
      return Response.json({ message: error.message }, { status: 400 });
    console.error('Admin password reset unavailable', error);
    return Response.json({ message: 'Password reset is unavailable.' }, { status: 503 });
  }
}
