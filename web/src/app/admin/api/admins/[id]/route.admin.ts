// Changes the two fixed admin records while enforcing self-removal and stale-edit rules.
import { z } from 'zod';
import {
  adminFromRequestAsync,
  cloudAdminEnabled,
  requireAdminRequestAsync,
  sameOrigin,
  smallJson,
} from '@/lib/admin/auth';
import { ADMIN_IDS, AuthConflictError, AuthInputError, updateAdmin } from '@/lib/admin/auth-store';
import { cloudUpdateAdmin } from '@/lib/supabase/admin-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminRequestAsync(request);
  if (unauthorized) return unauthorized;
  if (!sameOrigin(request))
    return Response.json({ message: 'Cross-origin request blocked.' }, { status: 403 });
  const id = (await params).id;
  if (!ADMIN_IDS.includes(id as (typeof ADMIN_IDS)[number]))
    return Response.json({ message: 'Admin not found.' }, { status: 404 });
  const input = await smallJson(request);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(100),
      status: z.enum(['active', 'disabled']),
      updatedAt: z.iso.datetime(),
    })
    .safeParse(input);
  if (!parsed.success)
    return Response.json({ message: 'Enter a name and valid status.' }, { status: 400 });
  try {
    const actor = (await adminFromRequestAsync(request))!;
    const admins = cloudAdminEnabled()
      ? await cloudUpdateAdmin(actor.id, id as (typeof ADMIN_IDS)[number], parsed.data)
      : updateAdmin(actor.id, id as (typeof ADMIN_IDS)[number], parsed.data);
    return Response.json({ admins }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AuthInputError)
      return Response.json({ message: error.message }, { status: 400 });
    if (error instanceof AuthConflictError)
      return Response.json({ message: error.message }, { status: 409 });
    console.error('Admin account update failed', error);
    return Response.json({ message: 'Could not update the admin.' }, { status: 500 });
  }
}
