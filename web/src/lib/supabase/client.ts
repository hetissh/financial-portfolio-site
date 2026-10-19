// Creates server-side Supabase clients; the secret key must never enter browser code.
import { createClient } from '@supabase/supabase-js';

function projectUrl() {
  const value = process.env.SUPABASE_URL;
  if (!value) throw new Error('SUPABASE_URL is required for cloud mode.');
  const url = new URL(value);
  if (url.origin !== value || (url.protocol !== 'https:' && url.hostname !== 'localhost'))
    throw new Error('SUPABASE_URL must be an HTTPS origin.');
  return value;
}

function key(name: 'SUPABASE_PUBLISHABLE_KEY' | 'SUPABASE_SECRET_KEY') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for cloud mode.`);
  return value;
}

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export function publicSupabase() {
  return createClient(projectUrl(), key('SUPABASE_PUBLISHABLE_KEY'), options);
}

export function adminSupabase() {
  return createClient(projectUrl(), key('SUPABASE_SECRET_KEY'), options);
}
