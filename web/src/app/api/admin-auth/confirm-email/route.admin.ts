// Confirms possession of the new email and revokes sessions tied to the old address.
import { z } from 'zod';
import { allowedAdminOrigin, cloudAdminEnabled, sameOrigin, smallJson } from '@/lib/admin/auth';
import { AuthInputError, confirmEmailChange } from '@/lib/admin/auth-store';
import { cloudConfirmEmailChange } from '@/lib/supabase/admin-auth';

export async function POST(request: Request) {
  if (!allowedAdminOrigin(request.headers.get('host'))) return new Response(null, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const parsed = z
    .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
    .safeParse(await smallJson(request));
  if (!parsed.success)
    return Response.json({ message: 'Invalid confirmation link.' }, { status: 400 });
  try {
    if (cloudAdminEnabled()) await cloudConfirmEmailChange(parsed.data.token);
    else confirmEmailChange(parsed.data.token);
    return Response.json({ message: 'Email confirmed. Sign in with your new address.' });
  } catch (error) {
    if (error instanceof AuthInputError)
      return Response.json({ message: error.message }, { status: 400 });
    console.error('Admin email confirmation failed', error);
    return Response.json({ message: 'Could not confirm this email.' }, { status: 500 });
  }
}
