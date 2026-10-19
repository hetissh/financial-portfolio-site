// Presents sign-in and password-recovery forms with one consistent error path.
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from './PasswordInput';
import styles from './admin.module.css';

type Mode = 'login' | 'forgot' | 'reset';
export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (mode === 'reset' && token) window.history.replaceState(null, '', '/reset-password/');
  }, [mode, token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    try {
      const body =
        mode === 'reset'
          ? { token, password: values.get('password') }
          : mode === 'login'
            ? { email: values.get('email'), password: values.get('password') }
            : { email: values.get('email') };
      const response = await fetch(`/api/admin-auth/${mode}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message || 'Please try again.');
        return;
      }
      if (mode === 'login') {
        router.replace('/admin/');
        router.refresh();
        return;
      }
      setSuccess(true);
      setMessage(result.message || 'Done.');
    } catch {
      setMessage('The server is unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <main id="main" className={`wrap ${styles.authPage}`}>
      <div className={styles.authCard}>
        <span className="eyebrow">ADMIN ACCESS</span>
        <h1>
          {mode === 'login'
            ? 'Sign in.'
            : mode === 'forgot'
              ? 'Forgot password.'
              : 'Reset password.'}
        </h1>
        <p>
          {mode === 'login'
            ? 'Use one of the two admin accounts.'
            : mode === 'forgot'
              ? 'Enter your admin email to receive a reset link.'
              : 'Choose a new password of at least 12 characters.'}
        </p>
        {message && (
          <p
            role={success ? 'status' : 'alert'}
            className={success ? styles.authSuccess : styles.authError}
          >
            {message}
          </p>
        )}
        {!success && (
          <form onSubmit={submit} className={styles.authForm}>
            {mode !== 'reset' && (
              <label>
                Email
                <input name="email" type="email" autoComplete="username" required maxLength={254} />
              </label>
            )}
            {mode !== 'forgot' && (
              <PasswordInput
                label={mode === 'login' ? 'Password' : 'New password'}
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'reset' ? 12 : undefined}
                maxLength={256}
              />
            )}
            <button className="button-primary" disabled={pending || (mode === 'reset' && !token)}>
              {pending
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : 'Reset password'}
            </button>
          </form>
        )}
        {mode === 'login' ? (
          <Link className="text-link" href="/forgot-password/">
            Forgot password?
          </Link>
        ) : (
          <Link className="text-link" href="/login/">
            Back to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
