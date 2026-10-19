// Binds the two fixed portfolio slots to existing Supabase Auth users by email.
// The default run only inspects; --apply fills empty bindings and never replaces one.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');

const slots = [
  { id: 'admin-1', email: process.env.ADMIN_ONE_EMAIL },
  { id: 'admin-2', email: process.env.ADMIN_TWO_EMAIL },
].map(({ id, email }) => ({ id, email: email?.trim().toLowerCase() }));
if (slots.some(({ email }) => !email) || slots[0].email === slots[1].email)
  throw new Error('Set two different ADMIN_ONE_EMAIL and ADMIN_TWO_EMAIL values.');

const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = new Map<string, string>();
for (let page = 1; ; page += 1) {
  const result = await client.auth.admin.listUsers({ page, perPage: 200 });
  if (result.error || !result.data) throw new Error('Could not inspect Supabase Auth users.');
  for (const user of result.data.users)
    if (user.email) users.set(user.email.toLowerCase(), user.id);
  if (result.data.users.length < 200) break;
}
const matches = slots.map(({ id, email }) => ({ id, authUserId: users.get(email!) }));
if (matches.some(({ authUserId }) => !authUserId))
  throw new Error('Both email addresses must first exist in Supabase Authentication → Users.');

const current = await client.from('portfolio_admins').select('id,auth_user_id');
if (current.error || !current.data || current.data.length !== 2)
  throw new Error('Apply the portfolio SQL migration before binding admin users.');
for (const match of matches) {
  const slot = current.data.find((entry) => entry.id === match.id);
  if (!slot || (slot.auth_user_id && slot.auth_user_id !== match.authUserId))
    throw new Error(`${match.id} is already bound to a different Auth user.`);
}

if (!process.argv.includes('--apply')) {
  console.log(
    'Both Auth users and fixed slots are ready. Dry run only; rerun with --apply to bind.',
  );
  process.exit(0);
}
for (const match of matches) {
  const slot = current.data.find((entry) => entry.id === match.id)!;
  if (slot.auth_user_id) continue;
  const result = await client
    .from('portfolio_admins')
    .update({ auth_user_id: match.authUserId, updated_at: new Date().toISOString() })
    .eq('id', match.id)
    .is('auth_user_id', null)
    .select('id');
  if (result.error || result.data?.length !== 1)
    throw new Error(`${match.id} could not be bound safely; inspect the slot before retrying.`);
}
console.log('Both fixed admin slots are bound to Supabase Auth users.');
