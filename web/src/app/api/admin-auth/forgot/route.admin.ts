// Requests a one-time reset link while returning the same public response for any address.
import { z } from 'zod';
import { allowedAdminOrigin, cloudAdminEnabled, sameOrigin, smallJson } from '@/lib/admin/auth';
import { cancelReset, requestReset } from '@/lib/admin/auth-store';
import { sendResetEmail } from '@/lib/admin/reset-mail';
import { cloudCancelReset, cloudRequestReset } from '@/lib/supabase/admin-auth';

export async function POST(request: Request) {
  if (!allowedAdminOrigin(request.headers.get('host'))) return new Response(null, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const parsed = z.object({ email: z.email() }).safeParse(await smallJson(request));
  if (!parsed.success)
    return Response.json({ message: 'Enter a valid email address.' }, { status: 400 });
  const result = cloudAdminEnabled()
    ? await cloudRequestReset(parsed.data.email)
    : requestReset(parsed.data.email);
  if (result) {
    try {
      await sendResetEmail(result.email, result.token);
    } catch (error) {
      if (cloudAdminEnabled()) await cloudCancelReset(result.token);
      else cancelReset(result.token);
      console.error('Admin recovery email failed', error);
    }
  }
  return Response.json(
    { message: 'If this is an active admin address, a reset link will be sent.' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
