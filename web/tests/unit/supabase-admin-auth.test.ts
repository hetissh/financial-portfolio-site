// Verifies that only bound, active Supabase users receive database-backed admin sessions.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  findSlot: vi.fn(),
  insertSession: vi.fn(),
  updateSlot: vi.fn(),
  findSession: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('../../src/lib/supabase/client', () => ({
  publicSupabase: () => ({ auth: { signInWithPassword: mocks.signIn } }),
  adminSupabase: () => ({
    auth: { admin: { getUserById: mocks.getUser } },
    from: (table: string) => {
      if (table === 'portfolio_admin_sessions')
        return {
          insert: mocks.insertSession,
          select: () => ({
            eq: () => ({ gt: () => ({ maybeSingle: mocks.findSession }) }),
          }),
        };
      return {
        select: () => ({ eq: () => ({ maybeSingle: mocks.findSlot }) }),
        update: () => ({ eq: mocks.updateSlot }),
      };
    },
  }),
}));

import { cloudActiveAdmin, cloudLogIn } from '../../src/lib/supabase/admin-auth';

const slot = {
  id: 'admin-1',
  auth_user_id: '00000000-0000-4000-8000-000000000001',
  name: 'Admin One',
  status: 'active',
  version: 1,
  created_at: '2026-10-14T00:00:00+00:00',
  updated_at: '2026-10-14T00:00:00+00:00',
  last_login_at: null,
};

describe('Supabase admin sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signIn.mockResolvedValue({ data: { user: { id: slot.auth_user_id } }, error: null });
    mocks.findSlot.mockResolvedValue({ data: slot, error: null });
    mocks.insertSession.mockResolvedValue({ error: null });
    mocks.updateSlot.mockResolvedValue({ error: null });
    mocks.findSession.mockResolvedValue({
      data: {
        admin_id: 'admin-1',
        auth_user_id: slot.auth_user_id,
        auth_version: 1,
        expires_at: '2030-10-14T00:00:00+00:00',
      },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { email: 'one@example.test' } },
      error: null,
    });
  });

  it('rejects an Auth user with no fixed slot or a disabled slot', async () => {
    mocks.findSlot.mockResolvedValueOnce({ data: null, error: null });
    expect(await cloudLogIn('unknown@example.test', 'password')).toBeUndefined();
    mocks.findSlot.mockResolvedValueOnce({ data: { ...slot, status: 'disabled' }, error: null });
    expect(await cloudLogIn('one@example.test', 'password')).toBeUndefined();
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it('stores only a hash for a bound active session', async () => {
    const token = await cloudLogIn('one@example.test', 'password');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mocks.insertSession).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin-1',
        auth_user_id: slot.auth_user_id,
        auth_version: 1,
        token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(JSON.stringify(mocks.insertSession.mock.calls)).not.toContain(token);
  });

  it('rejects a session after its slot is disabled or its version changes', async () => {
    const token = 'a'.repeat(43);
    expect((await cloudActiveAdmin(token))?.id).toBe('admin-1');
    mocks.findSlot.mockResolvedValueOnce({ data: { ...slot, status: 'disabled' }, error: null });
    expect(await cloudActiveAdmin(token)).toBeUndefined();
    mocks.findSlot.mockResolvedValueOnce({ data: { ...slot, version: 2 }, error: null });
    expect(await cloudActiveAdmin(token)).toBeUndefined();
  });
});
