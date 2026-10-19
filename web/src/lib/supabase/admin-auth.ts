// Uses Supabase Auth for passwords and private Postgres rows for revocable admin sessions.
import { z } from 'zod';
import {
  AuthConflictError,
  AuthInputError,
  type AdminId,
  type PublicAdmin,
} from '@/lib/admin/auth-store';
import { adminSupabase, publicSupabase } from './client';

const slotSchema = z.object({
  id: z.enum(['admin-1', 'admin-2']),
  auth_user_id: z.uuid().nullable(),
  name: z.string().min(1).max(100),
  status: z.enum(['active', 'disabled']),
  version: z.number().int().positive(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  last_login_at: z.iso.datetime({ offset: true }).nullable(),
});
const sessionSchema = z.object({
  admin_id: z.enum(['admin-1', 'admin-2']),
  auth_user_id: z.uuid(),
  auth_version: z.number().int().positive(),
  expires_at: z.iso.datetime({ offset: true }),
});
const validToken = /^[A-Za-z0-9_-]{43}$/;

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function publicAdmin(slot: z.infer<typeof slotSchema>, email: string): PublicAdmin {
  return {
    id: slot.id,
    name: slot.name,
    email,
    status: slot.status,
    authVersion: slot.version,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
    lastLoginAt: slot.last_login_at,
  };
}

export async function cloudLogIn(email: string, password: string) {
  const signIn = await publicSupabase().auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.user) return undefined;
  const client = adminSupabase();
  const row = await client
    .from('portfolio_admins')
    .select('*')
    .eq('auth_user_id', signIn.data.user.id)
    .maybeSingle();
  if (row.error) throw new Error('Unable to inspect admin access.');
  if (!row.data) return undefined;
  const slot = slotSchema.parse(row.data);
  if (slot.status !== 'active') return undefined;
  const token = newToken();
  const saved = await client.from('portfolio_admin_sessions').insert({
    token_hash: await tokenHash(token),
    admin_id: slot.id,
    auth_user_id: signIn.data.user.id,
    auth_version: slot.version,
    expires_at: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
  });
  if (saved.error) throw new Error('Unable to create admin session.');
  const updated = await client
    .from('portfolio_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', slot.id);
  if (updated.error) throw new Error('Unable to record admin sign-in.');
  return token;
}

export async function cloudActiveAdmin(
  token: string | undefined,
): Promise<PublicAdmin | undefined> {
  if (!token || !validToken.test(token)) return undefined;
  const client = adminSupabase();
  const sessionRow = await client
    .from('portfolio_admin_sessions')
    .select('admin_id,auth_user_id,auth_version,expires_at')
    .eq('token_hash', await tokenHash(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (sessionRow.error) throw new Error('Unable to inspect admin session.');
  if (!sessionRow.data) return undefined;
  const session = sessionSchema.parse(sessionRow.data);
  const [slotRow, authUser] = await Promise.all([
    client.from('portfolio_admins').select('*').eq('id', session.admin_id).maybeSingle(),
    client.auth.admin.getUserById(session.auth_user_id),
  ]);
  if (slotRow.error || authUser.error) throw new Error('Unable to inspect admin identity.');
  if (!slotRow.data || !authUser.data.user?.email) return undefined;
  const slot = slotSchema.parse(slotRow.data);
  if (
    slot.status !== 'active' ||
    slot.auth_user_id !== session.auth_user_id ||
    slot.version !== session.auth_version
  )
    return undefined;
  return publicAdmin(slot, authUser.data.user.email);
}

export async function cloudLogOut(token: string | undefined) {
  if (!token || !validToken.test(token)) return;
  const result = await adminSupabase()
    .from('portfolio_admin_sessions')
    .delete()
    .eq('token_hash', await tokenHash(token));
  if (result.error) throw new Error('Unable to end admin session.');
}

export async function cloudPublicAdmins(): Promise<PublicAdmin[]> {
  const client = adminSupabase();
  const result = await client.from('portfolio_admins').select('*').order('id');
  if (result.error || result.data?.length !== 2)
    throw new Error('Unable to load the two admin slots.');
  return Promise.all(
    result.data.map(async (raw) => {
      const slot = slotSchema.parse(raw);
      if (!slot.auth_user_id) throw new Error(`${slot.id} is not bound to an Auth user.`);
      const user = await client.auth.admin.getUserById(slot.auth_user_id);
      if (user.error || !user.data.user?.email)
        throw new Error(`Unable to load the Auth user for ${slot.id}.`);
      return publicAdmin(slot, user.data.user.email);
    }),
  );
}

async function slotById(id: AdminId) {
  const result = await adminSupabase()
    .from('portfolio_admins')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (result.error || !result.data) throw new Error('Unable to load admin slot.');
  return slotSchema.parse(result.data);
}

async function revokeSlotSessions(id: AdminId, version: number) {
  const client = adminSupabase();
  const updated = await client
    .from('portfolio_admins')
    .update({ version: version + 1, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('version', version)
    .select('id')
    .maybeSingle();
  if (updated.error || !updated.data) throw new AuthConflictError('Admin account changed. Reload.');
  const removed = await client.from('portfolio_admin_sessions').delete().eq('admin_id', id);
  if (removed.error) throw new Error('Unable to revoke admin sessions.');
}

async function verifyCurrentPassword(admin: PublicAdmin, password: string) {
  const verified = await publicSupabase().auth.signInWithPassword({
    email: admin.email,
    password,
  });
  const slot = await slotById(admin.id);
  if (verified.error || verified.data.user?.id !== slot.auth_user_id || slot.status !== 'active')
    throw new AuthInputError('Current password is incorrect.');
  return slot;
}

export async function cloudUpdateAdmin(
  currentId: AdminId,
  targetId: AdminId,
  input: { name: string; status: 'active' | 'disabled'; updatedAt: string },
) {
  const slot = await slotById(targetId);
  if (slot.updated_at !== input.updatedAt)
    throw new AuthConflictError('This account changed. Reload before saving.');
  if (currentId === targetId && input.status === 'disabled')
    throw new AuthInputError('You cannot disable your own account.');
  const client = adminSupabase();
  const updated = await client
    .from('portfolio_admins')
    .update({
      name: input.name,
      status: input.status,
      version: slot.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .eq('version', slot.version)
    .select('id')
    .maybeSingle();
  if (updated.error) {
    if (updated.error.message.includes('last active'))
      throw new AuthInputError('The last active administrator cannot be disabled.');
    throw new Error('Unable to update admin account.');
  }
  if (!updated.data) throw new AuthConflictError('This account changed. Reload before saving.');
  const removed = await client.from('portfolio_admin_sessions').delete().eq('admin_id', targetId);
  if (removed.error) throw new Error('Unable to revoke admin sessions.');
  return cloudPublicAdmins();
}

export async function cloudChangePassword(
  admin: PublicAdmin,
  oldPassword: string,
  password: string,
) {
  const slot = await verifyCurrentPassword(admin, oldPassword);
  await revokeSlotSessions(admin.id, slot.version);
  const changed = await adminSupabase().auth.admin.updateUserById(slot.auth_user_id!, { password });
  if (changed.error) throw new Error('Unable to change cloud admin password.');
}

export async function cloudRequestReset(email: string) {
  const admin = (await cloudPublicAdmins()).find(
    (item) => item.status === 'active' && item.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!admin) return;
  const slot = await slotById(admin.id);
  const client = adminSupabase();
  const recent = await client
    .from('portfolio_admin_resets')
    .select('token_hash', { count: 'exact', head: true })
    .eq('admin_id', admin.id)
    .gte('created_at', new Date(Date.now() - 60 * 60_000).toISOString());
  if (recent.error) throw new Error('Unable to inspect recovery limits.');
  if ((recent.count ?? 0) >= 3) return;
  const token = newToken();
  const saved = await client.from('portfolio_admin_resets').insert({
    token_hash: await tokenHash(token),
    admin_id: admin.id,
    auth_user_id: slot.auth_user_id,
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (saved.error) throw new Error('Unable to request admin recovery.');
  return { email: admin.email, token };
}

export async function cloudCancelReset(token: string) {
  const result = await adminSupabase()
    .from('portfolio_admin_resets')
    .delete()
    .eq('token_hash', await tokenHash(token));
  if (result.error) throw new Error('Unable to cancel recovery request.');
}

export async function cloudResetPassword(token: string, password: string) {
  if (!validToken.test(token)) throw new AuthInputError('Invalid or expired reset link.');
  const client = adminSupabase();
  const row = await client
    .from('portfolio_admin_resets')
    .select('admin_id,auth_user_id,expires_at')
    .eq('token_hash', await tokenHash(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (row.error) throw new Error('Unable to inspect recovery link.');
  if (!row.data) throw new AuthInputError('Invalid or expired reset link.');
  const slot = await slotById(row.data.admin_id as AdminId);
  if (slot.status !== 'active' || slot.auth_user_id !== row.data.auth_user_id)
    throw new AuthInputError('Invalid or expired reset link.');
  await revokeSlotSessions(slot.id, slot.version);
  const changed = await client.auth.admin.updateUserById(slot.auth_user_id!, { password });
  if (changed.error) throw new Error('Unable to reset cloud admin password.');
  await cloudCancelReset(token);
}

export async function cloudRequestEmailChange(
  actor: PublicAdmin,
  password: string,
  email: string,
  targetId: AdminId = actor.id,
) {
  await verifyCurrentPassword(actor, password);
  const target = await slotById(targetId);
  if (!target.auth_user_id) throw new AuthInputError('Admin account is not bound.');
  if (target.status !== 'active')
    throw new AuthInputError('Restore this admin before changing their email.');
  const admins = await cloudPublicAdmins();
  if (admins.some((item) => item.email.toLowerCase() === email.trim().toLowerCase()))
    throw new AuthInputError('Choose a different email address.');
  const token = newToken();
  const saved = await adminSupabase()
    .from('portfolio_admin_email_changes')
    .insert({
      token_hash: await tokenHash(token),
      admin_id: targetId,
      requested_by: actor.id,
      auth_user_id: target.auth_user_id,
      auth_version: target.version,
      email: email.trim().toLowerCase(),
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  if (saved.error) throw new Error('Unable to request cloud email change.');
  return { email: email.trim().toLowerCase(), token };
}

export async function cloudCancelEmailChange(token: string) {
  const result = await adminSupabase()
    .from('portfolio_admin_email_changes')
    .delete()
    .eq('token_hash', await tokenHash(token));
  if (result.error) throw new Error('Unable to cancel email change.');
}

export async function cloudConfirmEmailChange(token: string) {
  if (!validToken.test(token)) throw new AuthInputError('Invalid or expired confirmation link.');
  const client = adminSupabase();
  const row = await client
    .from('portfolio_admin_email_changes')
    .select('admin_id,auth_user_id,auth_version,email')
    .eq('token_hash', await tokenHash(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (row.error) throw new Error('Unable to inspect email confirmation.');
  if (!row.data) throw new AuthInputError('Invalid or expired confirmation link.');
  const requestedEmail = row.data.email;
  const slot = await slotById(row.data.admin_id as AdminId);
  if (
    slot.status !== 'active' ||
    slot.auth_user_id !== row.data.auth_user_id ||
    slot.version !== row.data.auth_version
  )
    throw new AuthConflictError('This account changed. Request a new confirmation link.');
  const admins = await cloudPublicAdmins();
  if (admins.some((item) => item.id !== slot.id && item.email === requestedEmail))
    throw new AuthInputError('That email is already in use.');
  await revokeSlotSessions(slot.id, slot.version);
  const changed = await client.auth.admin.updateUserById(slot.auth_user_id!, {
    email: requestedEmail,
    email_confirm: true,
  });
  if (changed.error) throw new Error('Unable to update cloud admin email.');
  await cloudCancelEmailChange(token);
}
