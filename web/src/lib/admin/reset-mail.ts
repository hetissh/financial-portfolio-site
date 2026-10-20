// Sends short-lived recovery links through Resend; credentials stay on the server.
import { runtimeSetting } from '@/lib/runtime-env';
export async function sendResetEmail(to: string, token: string) {
  const key = runtimeSetting('RESEND_API_KEY');
  const from = runtimeSetting('RESEND_FROM_EMAIL');
  const origin = runtimeSetting('ADMIN_ORIGIN');
  if (!key || !from || !origin) throw new Error('Resend recovery is not configured.');
  const link = new URL('/reset-password/', origin);
  link.searchParams.set('token', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your portfolio admin password',
      text: `Use this link within 15 minutes to reset your password:\n\n${link.toString()}\n\nIf you did not request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend rejected password reset email (${response.status}).`);
}

export async function sendEmailConfirmation(to: string, token: string) {
  const key = runtimeSetting('RESEND_API_KEY');
  const from = runtimeSetting('RESEND_FROM_EMAIL');
  const origin = runtimeSetting('ADMIN_ORIGIN');
  if (!key || !from || !origin) throw new Error('Resend email confirmation is not configured.');
  const link = new URL('/confirm-email/', origin);
  link.searchParams.set('token', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Confirm your portfolio admin email',
      text: `Use this link within 15 minutes to confirm your new admin email:\n\n${link.toString()}\n\nIf you did not request this, contact the site operator.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend rejected email confirmation (${response.status}).`);
}
