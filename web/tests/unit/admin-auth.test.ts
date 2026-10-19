// Verifies fixed-account persistence, recovery, and session revocation without sending email.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import testAdminFixture from '../fixtures/admin-accounts.json' with { type: 'json' };
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  activeAdmin,
  AuthConflictError,
  AuthInputError,
  confirmEmailChange,
  initializeAdmins,
  logIn,
  publicAdmins,
  requestEmailChange,
  requestReset,
  resetPassword,
  updateAdmin,
} from '../../src/lib/admin/auth-store';
import { POST as forgotPassword } from '../../src/app/api/admin-auth/forgot/route.admin';
import { POST as finishReset } from '../../src/app/api/admin-auth/reset/route.admin';

describe('fixed two-admin account store', () => {
  const previous = process.env.PORTFOLIO_AUTH_FILE;
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'portfolio-auth-'));
    process.env.PORTFOLIO_AUTH_FILE = path.join(root, 'auth.json');
    initializeAdmins([testAdminFixture.accounts[0], testAdminFixture.accounts[1]]);
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.PORTFOLIO_AUTH_FILE;
    else process.env.PORTFOLIO_AUTH_FILE = previous;
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('keeps exactly two fixed IDs and refuses to overwrite initialized credentials', () => {
    expect(publicAdmins().map((admin) => admin.id)).toEqual(['admin-1', 'admin-2']);
    expect(() =>
      initializeAdmins([
        {
          name: testAdminFixture.accounts[0].name,
          email: testAdminFixture.accounts[0].email,
          password: 'another-password-2026',
        },
        {
          name: testAdminFixture.accounts[1].name,
          email: testAdminFixture.accounts[1].email,
          password: 'another-password-2026',
        },
      ]),
    ).toThrow();
    expect(
      logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password),
    ).toBeTruthy();
  });

  it('allows a logged-in admin to remove the other, revokes sessions, and forbids self-removal', () => {
    const one = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    const two = logIn(testAdminFixture.accounts[1].email, testAdminFixture.accounts[1].password)!;
    const first = publicAdmins()[0];
    expect(() =>
      updateAdmin('admin-1', 'admin-1', {
        name: first.name,
        status: 'disabled',
        updatedAt: first.updatedAt,
      }),
    ).toThrow(AuthInputError);
    const second = publicAdmins()[1];
    updateAdmin('admin-1', 'admin-2', {
      name: second.name,
      status: 'disabled',
      updatedAt: second.updatedAt,
    });
    expect(activeAdmin(two)).toBeUndefined();
    expect(activeAdmin(one)?.id).toBe('admin-1');
    expect(
      logIn(testAdminFixture.accounts[1].email, testAdminFixture.accounts[1].password),
    ).toBeUndefined();
    const restored = publicAdmins()[1];
    updateAdmin('admin-1', 'admin-2', {
      name: restored.name,
      status: 'active',
      updatedAt: restored.updatedAt,
    });
    expect(() =>
      updateAdmin('admin-1', 'admin-2', {
        name: restored.name,
        status: 'disabled',
        updatedAt: restored.updatedAt,
      }),
    ).toThrow(AuthConflictError);
  });

  it('uses a reset token once and invalidates every old session', () => {
    const old = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    const issued = requestReset(testAdminFixture.accounts[0].email)!;
    expect(issued.email).toBe(testAdminFixture.accounts[0].email);
    resetPassword(issued.token, 'new-private-password-2026');
    expect(activeAdmin(old)).toBeUndefined();
    expect(() => resetPassword(issued.token, 'another-private-password-2026')).toThrow(
      AuthInputError,
    );
    expect(logIn(testAdminFixture.accounts[0].email, 'new-private-password-2026')).toBeTruthy();
  });

  it('changes only the requesting admin email after password and token confirmation', () => {
    const old = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
    expect(() => requestEmailChange('admin-1', 'wrong-password', 'new@example.test')).toThrow(
      AuthInputError,
    );
    expect(() =>
      requestEmailChange(
        'admin-1',
        testAdminFixture.accounts[0].password,
        testAdminFixture.accounts[1].email,
      ),
    ).toThrow(AuthInputError);
    const issued = requestEmailChange(
      'admin-1',
      testAdminFixture.accounts[0].password,
      'new@example.test',
    );
    expect(publicAdmins()[0].email).toBe(testAdminFixture.accounts[0].email);
    confirmEmailChange(issued.token);
    expect(publicAdmins()[0].email).toBe('new@example.test');
    expect(activeAdmin(old)).toBeUndefined();
    expect(() => confirmEmailChange(issued.token)).toThrow(AuthInputError);
  });

  it('lets an admin request a confirmed email change for the other fixed account', () => {
    const otherSession = logIn(
      testAdminFixture.accounts[1].email,
      testAdminFixture.accounts[1].password,
    )!;
    const issued = requestEmailChange(
      'admin-1',
      testAdminFixture.accounts[0].password,
      'replacement@example.test',
      'admin-2',
    );
    expect(publicAdmins()[1].email).toBe(testAdminFixture.accounts[1].email);
    confirmEmailChange(issued.token);
    expect(publicAdmins()[1].email).toBe('replacement@example.test');
    expect(activeAdmin(otherSession)).toBeUndefined();
    expect(logIn('replacement@example.test', testAdminFixture.accounts[1].password)).toBeTruthy();
    expect(
      logIn(testAdminFixture.accounts[1].email, testAdminFixture.accounts[1].password),
    ).toBeUndefined();
  });

  it('sends a Resend link and consumes it through the public recovery endpoints', async () => {
    const prior = {
      admin: process.env.PORTFOLIO_ADMIN,
      origin: process.env.ADMIN_ORIGIN,
      key: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    };
    process.env.PORTFOLIO_ADMIN = '1';
    process.env.ADMIN_ORIGIN = 'http://127.0.0.1:3000';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'admin@example.test';
    let sent = '';
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body)).text;
      return Response.json({ id: 'test-message' });
    });
    try {
      const request = (url: string, body: object) =>
        new Request(`http://127.0.0.1:3000${url}`, {
          method: 'POST',
          headers: {
            host: '127.0.0.1:3000',
            origin: 'http://127.0.0.1:3000',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      const old = logIn(testAdminFixture.accounts[0].email, testAdminFixture.accounts[0].password)!;
      const started = await forgotPassword(
        request('/api/admin-auth/forgot/', { email: testAdminFixture.accounts[0].email }),
      );
      expect(started.status).toBe(200);
      expect(sent).toContain('/reset-password/?token=');
      const token = /token=([A-Za-z0-9_-]{43})/.exec(sent)![1];
      const finished = await finishReset(
        request('/api/admin-auth/reset/', { token, password: 'updated-password-2026' }),
      );
      expect(finished.status).toBe(200);
      expect(activeAdmin(old)).toBeUndefined();
      expect(
        (
          await finishReset(
            request('/api/admin-auth/reset/', { token, password: 'another-password-2026' }),
          )
        ).status,
      ).toBe(400);
      expect(logIn(testAdminFixture.accounts[0].email, 'updated-password-2026')).toBeTruthy();
    } finally {
      for (const [key, value] of Object.entries({
        PORTFOLIO_ADMIN: prior.admin,
        ADMIN_ORIGIN: prior.origin,
        RESEND_API_KEY: prior.key,
        RESEND_FROM_EMAIL: prior.from,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
