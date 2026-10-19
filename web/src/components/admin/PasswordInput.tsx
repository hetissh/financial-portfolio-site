// Lets admins inspect only the password they are typing without changing form submission.
'use client';
import { useId, useState } from 'react';
import styles from './admin.module.css';

export function PasswordInput({
  label,
  name,
  autoComplete,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  maxLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.passwordField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordControl}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}
