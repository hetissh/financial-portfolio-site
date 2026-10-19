// Confirms a delivered email-change token after the visitor clicks its link.
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';
export function EmailConfirmation({ token }: { token?: string }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (token) window.history.replaceState(null, '', '/confirm-email/');
  }, [token]);
  async function confirm() {
    if (!token || pending) return;
    setPending(true);
    try {
      const response = await fetch('/api/admin-auth/confirm-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { message?: string };
      setMessage(result.message || 'Could not confirm this email.');
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
        <h1>Confirm email.</h1>
        {message ? (
          <p role="status">{message}</p>
        ) : (
          <p>Confirm this address for your admin account.</p>
        )}
        <button
          className="button-primary"
          disabled={!token || pending || Boolean(message)}
          onClick={() => void confirm()}
        >
          {pending ? 'Confirming…' : 'Confirm email'}
        </button>
        <p>
          <Link className="text-link" href="/login/">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
