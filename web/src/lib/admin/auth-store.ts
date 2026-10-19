// Owns the two fixed admin identities, private JSON credentials, sessions, and recovery tokens.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const ADMIN_IDS = ['admin-1', 'admin-2'] as const;
export type AdminId = (typeof ADMIN_IDS)[number];
const emailSchema = z.email().max(254);
const adminSchema = z.object({
  id: z.enum(ADMIN_IDS),
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  passwordHash: z.string().regex(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/),
  status: z.enum(['active', 'disabled']),
  authVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
});
const sessionSchema = z.object({
  adminId: z.enum(ADMIN_IDS),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  authVersion: z.number().int().positive(),
  expiresAt: z.iso.datetime(),
});
const resetSchema = z.object({
  adminId: z.enum(ADMIN_IDS),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.iso.datetime(),
});
const emailChangeSchema = z.object({
  adminId: z.enum(ADMIN_IDS),
  email: emailSchema,
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.iso.datetime(),
});
const attemptSchema = z.object({
  kind: z.enum(['login', 'reset', 'email', 'credential']),
  key: z.string(),
  at: z.number(),
});
const auditSchema = z.object({ at: z.iso.datetime(), actor: z.string(), action: z.string() });
const authSchema = z.object({
  admins: z.tuple([adminSchema, adminSchema]),
  sessions: z.array(sessionSchema),
  resets: z.array(resetSchema),
  emailChanges: z.array(emailChangeSchema).default([]),
  attempts: z.array(attemptSchema),
  audit: z.array(auditSchema),
});
type AuthState = z.infer<typeof authSchema>;
export type Admin = z.infer<typeof adminSchema>;
export type PublicAdmin = Omit<Admin, 'passwordHash'>;

export class AuthInputError extends Error {}
export class AuthConflictError extends Error {}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const nowIso = () => new Date().toISOString();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const randomToken = () => randomBytes(32).toString('base64url');

export function authFile() {
  // The private auth path is mounted at runtime and must never be traced into a build.
  const file = path.resolve(
    /* turbopackIgnore: true */ process.env.PORTFOLIO_AUTH_FILE || '.admin-data/auth.json',
  );
  const root = process.cwd();
  for (const privateBoundary of ['public', 'src/content', 'out']) {
    if (file.startsWith(`${root}${path.sep}${privateBoundary}${path.sep}`))
      throw new Error('The admin auth file must be outside public and content directories.');
  }
  const parent = path.dirname(file);
  if (fs.existsSync(parent)) {
    const realParent = fs.realpathSync(/* turbopackIgnore: true */ parent);
    for (const privateBoundary of ['public', 'src/content', 'out']) {
      const boundary = `${root}${path.sep}${privateBoundary}`;
      if (realParent === boundary || realParent.startsWith(`${boundary}${path.sep}`))
        throw new Error('The admin auth file must be outside public and content directories.');
    }
  }
  return file;
}

export function hashPassword(password: string) {
  if (password.length < 12 || password.length > 256)
    throw new AuthInputError('Use a password between 12 and 256 characters.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split('$');
  if (!salt || !hash || password.length > 256) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readState(): AuthState {
  const file = authFile();
  const stats = fs.lstatSync(/* turbopackIgnore: true */ file);
  if (!stats.isFile() || (stats.mode & 0o077) !== 0)
    throw new Error('The admin auth file must be a private regular file (mode 0600).');
  const state = authSchema.parse(
    JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, 'utf8')),
  );
  if (state.admins[0].id !== ADMIN_IDS[0] || state.admins[1].id !== ADMIN_IDS[1])
    throw new Error('Admin identities do not match the fixed account slots.');
  if (state.admins[0].email.toLowerCase() === state.admins[1].email.toLowerCase())
    throw new Error('Admin email addresses must be unique.');
  return state;
}

function writeState(state: AuthState, initial = false) {
  const file = authFile();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  if (initial) {
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return;
  }
  const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function audit(state: AuthState, actor: string, action: string) {
  state.audit.push({ at: nowIso(), actor, action });
  state.audit = state.audit.slice(-500);
}

// Bootstrap is explicit: starting the web server never invents a usable credential.
export function initializeAdmins(
  input: readonly [
    { email: string; password: string; name: string },
    { email: string; password: string; name: string },
  ],
) {
  const emails = input.map((entry) => emailSchema.parse(normalizeEmail(entry.email)));
  if (emails[0] === emails[1]) throw new AuthInputError('Use two different admin email addresses.');
  const createdAt = nowIso();
  const admins = ADMIN_IDS.map((id, index) => ({
    id,
    name: input[index].name,
    email: emails[index],
    passwordHash: hashPassword(input[index].password),
    status: 'active' as const,
    authVersion: 1,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: null,
  })) as AuthState['admins'];
  writeState(
    authSchema.parse({
      admins,
      sessions: [],
      resets: [],
      emailChanges: [],
      attempts: [],
      audit: [],
    }),
    true,
  );
}

export function publicAdmins() {
  return readState().admins.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
    authVersion: admin.authVersion,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    lastLoginAt: admin.lastLoginAt,
  }));
}

export function activeAdmin(token: string | undefined): PublicAdmin | undefined {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const state = readState();
  const session = state.sessions.find((entry) => entry.tokenHash === tokenHash(token));
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return;
  const admin = state.admins.find((entry) => entry.id === session.adminId);
  if (!admin || admin.status !== 'active' || admin.authVersion !== session.authVersion) return;
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
    authVersion: admin.authVersion,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    lastLoginAt: admin.lastLoginAt,
  };
}

function rateLimited(
  state: AuthState,
  kind: 'login' | 'reset' | 'email' | 'credential',
  key: string,
) {
  const cutoff = Date.now() - 15 * 60_000;
  state.attempts = state.attempts.filter((entry) => entry.at > cutoff).slice(-200);
  const globalCount = state.attempts.filter((entry) => entry.kind === kind).length;
  const keyCount = state.attempts.filter(
    (entry) => entry.kind === kind && entry.key === key,
  ).length;
  state.attempts.push({ kind, key, at: Date.now() });
  writeState(state);
  return globalCount >= 30 || keyCount >= (kind === 'login' ? 5 : 3);
}

export function logIn(email: string, password: string) {
  const state = readState();
  const normalized = normalizeEmail(email);
  if (rateLimited(state, 'login', tokenHash(normalized))) return undefined;
  const admin = state.admins.find(
    (entry) => entry.email === normalized && entry.status === 'active',
  );
  // Verify a well-formed dummy hash so an unknown email has similar work to a real one.
  const dummy = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);
  if (!verifyPassword(password, admin?.passwordHash || dummy) || !admin) {
    audit(state, 'anonymous', 'login-failed');
    writeState(state);
    return undefined;
  }
  const token = randomToken();
  state.sessions = state.sessions.filter((entry) => Date.parse(entry.expiresAt) > Date.now());
  state.sessions.push({
    adminId: admin.id,
    tokenHash: tokenHash(token),
    authVersion: admin.authVersion,
    expiresAt: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
  });
  admin.lastLoginAt = nowIso();
  audit(state, admin.id, 'login');
  writeState(state);
  return token;
}

export function logOut(token: string | undefined) {
  if (!token) return;
  const state = readState();
  state.sessions = state.sessions.filter((entry) => entry.tokenHash !== tokenHash(token));
  writeState(state);
}

export function updateAdmin(actorId: AdminId, targetId: AdminId, input: unknown) {
  const data = z
    .object({
      name: z.string().trim().min(1).max(100),
      status: z.enum(['active', 'disabled']),
      updatedAt: z.iso.datetime(),
    })
    .parse(input);
  const state = readState();
  const admin = state.admins.find((entry) => entry.id === targetId)!;
  if (admin.updatedAt !== data.updatedAt)
    throw new AuthConflictError('This account changed. Reload before saving.');
  if (actorId === targetId && data.status === 'disabled')
    throw new AuthInputError('You cannot disable your own account.');
  if (
    data.status === 'disabled' &&
    state.admins.filter((entry) => entry.status === 'active').length < 2 &&
    admin.status === 'active'
  )
    throw new AuthInputError('The last active admin cannot be disabled.');
  admin.name = data.name;
  if (admin.status !== data.status) {
    admin.status = data.status;
    admin.authVersion += 1;
    state.sessions = state.sessions.filter((entry) => entry.adminId !== targetId);
    state.resets = state.resets.filter((entry) => entry.adminId !== targetId);
    state.emailChanges = state.emailChanges.filter((entry) => entry.adminId !== targetId);
  }
  admin.updatedAt = nowIso();
  audit(state, actorId, `admin-${targetId}-${data.status}`);
  writeState(state);
  return publicAdmins();
}

export function requestReset(email: string) {
  const state = readState();
  const normalized = normalizeEmail(email);
  if (rateLimited(state, 'reset', tokenHash(normalized))) return undefined;
  const admin = state.admins.find(
    (entry) => entry.email === normalized && entry.status === 'active',
  );
  if (!admin) return undefined;
  const token = randomToken();
  state.resets = state.resets.filter(
    (entry) => entry.adminId !== admin.id && Date.parse(entry.expiresAt) > Date.now(),
  );
  state.resets.push({
    adminId: admin.id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  audit(state, admin.id, 'reset-requested');
  writeState(state);
  return { token, email: admin.email, adminId: admin.id };
}

export function resetPassword(token: string, password: string) {
  const state = readState();
  const entry = state.resets.find((item) => item.tokenHash === tokenHash(token));
  if (!entry || Date.parse(entry.expiresAt) <= Date.now())
    throw new AuthInputError('This reset link is invalid or expired.');
  const admin = state.admins.find((item) => item.id === entry.adminId)!;
  if (admin.status !== 'active') throw new AuthInputError('This reset link is invalid or expired.');
  admin.passwordHash = hashPassword(password);
  admin.authVersion += 1;
  admin.updatedAt = nowIso();
  state.resets = state.resets.filter((item) => item.adminId !== admin.id);
  state.emailChanges = state.emailChanges.filter((item) => item.adminId !== admin.id);
  state.sessions = state.sessions.filter((item) => item.adminId !== admin.id);
  audit(state, admin.id, 'password-reset');
  writeState(state);
}

export function cancelReset(token: string) {
  const state = readState();
  state.resets = state.resets.filter((entry) => entry.tokenHash !== tokenHash(token));
  writeState(state);
}

export function changePassword(adminId: AdminId, currentPassword: string, newPassword: string) {
  const state = readState();
  const admin = state.admins.find((entry) => entry.id === adminId)!;
  if (rateLimited(state, 'credential', tokenHash(adminId)))
    throw new AuthInputError('Too many password attempts. Try again later.');
  if (!verifyPassword(currentPassword, admin.passwordHash))
    throw new AuthInputError('Current password is incorrect.');
  admin.passwordHash = hashPassword(newPassword);
  admin.authVersion += 1;
  admin.updatedAt = nowIso();
  state.sessions = state.sessions.filter((entry) => entry.adminId !== adminId);
  state.resets = state.resets.filter((entry) => entry.adminId !== adminId);
  state.emailChanges = state.emailChanges.filter((entry) => entry.adminId !== adminId);
  audit(state, adminId, 'password-changed');
  writeState(state);
}

export function requestEmailChange(
  adminId: AdminId,
  currentPassword: string,
  requestedEmail: string,
  targetId: AdminId = adminId,
) {
  const email = emailSchema.parse(normalizeEmail(requestedEmail));
  const state = readState();
  const admin = state.admins.find((entry) => entry.id === adminId)!;
  if (rateLimited(state, 'credential', tokenHash(adminId)))
    throw new AuthInputError('Too many password attempts. Try again later.');
  if (!verifyPassword(currentPassword, admin.passwordHash))
    throw new AuthInputError('Current password is incorrect.');
  const target = state.admins.find((entry) => entry.id === targetId)!;
  if (target.status !== 'active')
    throw new AuthInputError('Restore this admin before changing their email.');
  if (state.admins.some((entry) => entry.email === email))
    throw new AuthInputError('That email is already in use.');
  if (rateLimited(state, 'email', tokenHash(adminId)))
    throw new AuthInputError('Too many email changes. Try again later.');
  const token = randomToken();
  state.emailChanges = state.emailChanges.filter(
    (entry) => entry.adminId !== targetId && Date.parse(entry.expiresAt) > Date.now(),
  );
  state.emailChanges.push({
    adminId: targetId,
    email,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  audit(state, adminId, `email-change-requested-for-${targetId}`);
  writeState(state);
  return { email, token };
}

export function cancelEmailChange(token: string) {
  const state = readState();
  state.emailChanges = state.emailChanges.filter((entry) => entry.tokenHash !== tokenHash(token));
  writeState(state);
}

export function confirmEmailChange(token: string) {
  const state = readState();
  const entry = state.emailChanges.find((item) => item.tokenHash === tokenHash(token));
  if (!entry || Date.parse(entry.expiresAt) <= Date.now())
    throw new AuthInputError('This confirmation link is invalid or expired.');
  if (state.admins.some((admin) => admin.id !== entry.adminId && admin.email === entry.email))
    throw new AuthInputError('That email is already in use.');
  const admin = state.admins.find((item) => item.id === entry.adminId)!;
  if (admin.status !== 'active')
    throw new AuthInputError('This confirmation link is invalid or expired.');
  admin.email = entry.email;
  admin.authVersion += 1;
  admin.updatedAt = nowIso();
  state.emailChanges = state.emailChanges.filter((item) => item.adminId !== admin.id);
  state.resets = state.resets.filter((item) => item.adminId !== admin.id);
  state.sessions = state.sessions.filter((item) => item.adminId !== admin.id);
  audit(state, admin.id, 'email-changed');
  writeState(state);
}
