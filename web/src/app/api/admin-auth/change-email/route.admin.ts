// Sends confirmation to an admin's requested new email after checking their password.
import { z } from 'zod';
import {
  adminFromRequestAsync,
  cloudAdminEnabled,
  requireAdminRequestAsync,
  sameOrigin,
  smallJson,
} from '@/lib/admin/auth';
import {
  ADMIN_IDS,
  AuthInputError,
  cancelEmailChange,
  requestEmailChange,
} from '@/lib/admin/auth-store';
import { sendEmailConfirmation } from '@/lib/admin/reset-mail';
import { cloudCancelEmailChange, cloudRequestEmailChange } from '@/lib/supabase/admin-auth';

export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const parsed = z
    .object({
      email: z.email(),
      currentPassword: z.string().min(1).max(256),
      targetId: z.enum(ADMIN_IDS).optional(),
    })
    .safeParse(await smallJson(request));
  if (!parsed.success)
    return Response.json(
      { message: 'Enter a valid email and your current password.' },
      { status: 400 },
    );
  try {
    const admin = (await adminFromRequestAsync(request))!;
    const change = cloudAdminEnabled()
      ? await cloudRequestEmailChange(
          admin,
          parsed.data.currentPassword,
          parsed.data.email,
          parsed.data.targetId,
        )
      : requestEmailChange(
          admin.id,
          parsed.data.currentPassword,
          parsed.data.email,
          parsed.data.targetId,
        );
    try {
      await sendEmailConfirmation(change.email, change.token);
    } catch (error) {
      if (cloudAdminEnabled()) await cloudCancelEmailChange(change.token);
      else cancelEmailChange(change.token);
      throw error;
    }
    return Response.json({ message: 'Check your new email for a confirmation link.' });
  } catch (error) {
    if (error instanceof AuthInputError)
      return Response.json({ message: error.message }, { status: 400 });
    console.error('Admin email change failed', error);
    return Response.json(
      { message: 'Could not send confirmation. Try again later.' },
      { status: 503 },
    );
  }
}
