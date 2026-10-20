// Enforces admin sessions at both page and API boundaries; content routes never trust the UI.
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { activeAdmin, type PublicAdmin } from './auth-store';
import { cloudActiveAdmin } from '@/lib/supabase/admin-auth';
import { runtimeSetting } from '@/lib/runtime-env';

export const SESSION_COOKIE = 'portfolio_admin_session';
export const adminEnabled = () => runtimeSetting('PORTFOLIO_ADMIN') === '1';
export const cloudAdminEnabled = () => runtimeSetting('PORTFOLIO_DATA_SOURCE') === 'supabase';

export function allowedAdminOrigin(host: string | null) {
  if (!host || !adminEnabled()) return undefined;
  const configured = runtimeSetting('ADMIN_ORIGIN');
  if (configured) {
    const origin = new URL(configured);
    if (
      origin.origin !== configured ||
      (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname))
    )
      throw new Error(
        'ADMIN_ORIGIN must be an HTTPS origin, or a local HTTP origin for development.',
      );
    return origin.host === host ? configured : undefined;
  }
  // Local development remains safe without a domain; hosted admin requires ADMIN_ORIGIN.
  return /^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) ? `http://${host}` : undefined;
}

export function sameOrigin(request: Request) {
  const expected = allowedAdminOrigin(request.headers.get('host'));
  return Boolean(expected && request.headers.get('origin') === expected);
}

// Authentication requests are tiny; cap streamed bodies even without Content-Length.
export async function smallJson(request: Request): Promise<unknown> {
  const maximum = 4096;
  if (Number(request.headers.get('content-length')) > maximum) return undefined;
  if (!request.headers.get('content-type')?.startsWith('application/json')) return undefined;
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}

export function sessionToken(request: Request) {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
}

export function adminFromRequest(request: Request): PublicAdmin | undefined {
  if (!allowedAdminOrigin(request.headers.get('host'))) return;
  return activeAdmin(sessionToken(request));
}

export async function adminFromRequestAsync(request: Request): Promise<PublicAdmin | undefined> {
  if (!allowedAdminOrigin(request.headers.get('host'))) return;
  return cloudAdminEnabled()
    ? cloudActiveAdmin(sessionToken(request))
    : activeAdmin(sessionToken(request));
}

export function requireAdminRequest(request: Request) {
  if (!adminEnabled()) return Response.json({ message: 'Not found' }, { status: 404 });
  if (!allowedAdminOrigin(request.headers.get('host')))
    return Response.json({ message: 'Invalid admin host.' }, { status: 403 });
  if (!adminFromRequest(request))
    return Response.json({ message: 'Sign in to continue.' }, { status: 401 });
}

export async function requireAdminRequestAsync(request: Request) {
  if (!adminEnabled()) return Response.json({ message: 'Not found' }, { status: 404 });
  if (!allowedAdminOrigin(request.headers.get('host')))
    return Response.json({ message: 'Invalid admin host.' }, { status: 403 });
  if (!(await adminFromRequestAsync(request)))
    return Response.json({ message: 'Sign in to continue.' }, { status: 401 });
}

export async function requireAdminPage(): Promise<PublicAdmin> {
  const host = (await headers()).get('host');
  if (!allowedAdminOrigin(host)) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = cloudAdminEnabled() ? await cloudActiveAdmin(token) : activeAdmin(token);
  if (!admin) redirect('/login/');
  return admin;
}
