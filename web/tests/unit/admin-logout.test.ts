// Verifies that the logout route can redirect home while expiring the browser session.
import { afterEach, expect, it, vi } from 'vitest';
import { POST } from '../../src/app/api/admin-auth/logout/route.admin';

afterEach(() => vi.unstubAllEnvs());

it('redirects to the public main page and clears the session cookie', async () => {
  vi.stubEnv('PORTFOLIO_ADMIN', '1');
  vi.stubEnv('ADMIN_ORIGIN', 'http://127.0.0.1:3000');
  const request = new Request('http://localhost:3000/api/admin-auth/logout/', {
    method: 'POST',
    headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
  });

  const response = await POST(request);
  expect(response.status).toBe(303);
  expect(response.headers.get('Location')).toBe('http://127.0.0.1:3000/');
  expect(response.headers.get('Set-Cookie')).toContain('portfolio_admin_session=;');
  expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
});
