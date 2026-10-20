// Lets a signed-in admin replace only their own password and revokes current sessions.
import { z } from 'zod';
import {
  adminFromRequestAsync,
  cloudAdminEnabled,
  requireAdminRequestAsync,
  sameOrigin,
  smallJson,
  SESSION_COOKIE,
} from '@/lib/admin/auth';
import { AuthInputError, changePassword } from '@/lib/admin/auth-store';
import { cloudChangePassword } from '@/lib/supabase/admin-auth';
import { runtimeSetting } from '@/lib/runtime-env';

export async function POST(request: Request) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(256),
      newPassword: z.string().min(12).max(256),
    })
    .safeParse(await smallJson(request));
  if (!parsed.success)
    return Response.json(
      { message: 'Use your current password and a new password of at least 12 characters.' },
      { status: 400 },
    );
  try {
    const admin = (await adminFromRequestAsync(request))!;
    if (cloudAdminEnabled())
      await cloudChangePassword(admin, parsed.data.currentPassword, parsed.data.newPassword);
    else changePassword(admin.id, parsed.data.currentPassword, parsed.data.newPassword);
    const response = Response.json({ message: 'Password changed. Sign in again.' });
    response.headers.set(
      'Set-Cookie',
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${runtimeSetting('ADMIN_ORIGIN')?.startsWith('https://') ? '; Secure' : ''}`,
    );
    return response;
  } catch (error) {
    if (error instanceof AuthInputError)
      return Response.json({ message: error.message }, { status: 400 });
    console.error('Admin password change failed', error);
    return Response.json({ message: 'Could not change password.' }, { status: 500 });
  }
}
