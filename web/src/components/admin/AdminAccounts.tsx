// Edits the two fixed account slots and makes the current account's removal unavailable.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminId, PublicAdmin } from '@/lib/admin/auth-store';
import { PasswordInput } from './PasswordInput';
import styles from './admin.module.css';

export function AdminAccounts({
  initial,
  currentId,
}: {
  initial: PublicAdmin[];
  currentId: AdminId;
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState(initial);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState('');
  async function save(
    admin: PublicAdmin,
    changes: { name: string; status: 'active' | 'disabled' },
  ) {
    if (busy) return;
    setBusy(admin.id);
    setMessage('');
    try {
      const response = await fetch(`/admin/api/admins/${admin.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...changes, updatedAt: admin.updatedAt }),
      });
      const result = (await response.json()) as { admins?: PublicAdmin[]; message?: string };
      if (!response.ok || !result.admins) {
        setMessage(result.message || 'Could not update this admin.');
        return;
      }
      setAdmins(result.admins);
      setMessage('Admin account updated.');
      router.refresh();
    } catch {
      setMessage('The server is unavailable. Please try again.');
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      {message && (
        <p role={message.includes('updated') ? 'status' : 'alert'} className={styles.panelNote}>
          {message}
        </p>
      )}
      <div className={styles.adminCards}>
        {admins.map((admin) => (
          <AccountCard
            key={admin.id}
            admin={admin}
            currentId={currentId}
            busy={Boolean(busy)}
            save={save}
          />
        ))}
      </div>
      <OwnAccountSettings email={admins.find((admin) => admin.id === currentId)!.email} />
    </>
  );
}

function AccountCard({
  admin,
  currentId,
  busy,
  save,
}: {
  admin: PublicAdmin;
  currentId: AdminId;
  busy: boolean;
  save: (
    admin: PublicAdmin,
    changes: { name: string; status: 'active' | 'disabled' },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(admin.name);
  const self = admin.id === currentId;
  return (
    <section className={styles.panel} aria-label={`${admin.name} admin account`}>
      <div className={styles.panelHead}>
        <h2>{admin.name}</h2>
        <span className="small-label">
          {self ? 'You' : admin.status === 'active' ? 'Active' : 'Access removed'}
        </span>
      </div>
      <p className={styles.panelNote}>{admin.email}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(admin, { name, status: admin.status });
        }}
        className={styles.authForm}
      >
        <label>
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={1}
            maxLength={100}
            required
          />
        </label>
        <button className="button-primary" disabled={busy || name.trim() === admin.name}>
          Save name
        </button>
      </form>
      <p className={styles.panelNote}>
        Last sign in: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
      </p>
      {self ? (
        <p className={styles.panelNote}>You cannot remove your own access.</p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            className={styles.accountAction}
            onClick={() => {
              const removing = admin.status === 'active';
              if (
                !removing ||
                window.confirm(
                  `Remove ${admin.name}'s admin access? Their sessions will end immediately.`,
                )
              )
                void save(admin, { name: admin.name, status: removing ? 'disabled' : 'active' });
            }}
          >
            {admin.status === 'active' ? 'Remove access' : 'Restore access'}
          </button>
          {admin.status === 'active' && <OtherEmailChange admin={admin} />}
        </>
      )}
    </section>
  );
}

function OtherEmailChange({ admin }: { admin: PublicAdmin }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch('/api/admin-auth/change-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: admin.id,
          email: values.get('email'),
          currentPassword: values.get('currentPassword'),
        }),
      });
      const result = (await response.json()) as { message?: string };
      setMessage(result.message || 'Please try again.');
      if (response.ok) form.reset();
    } catch {
      setMessage('The server is unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={styles.authForm} onSubmit={(event) => void submit(event)}>
      <h3>Change email for {admin.name}</h3>
      <p className={styles.panelNote}>The new address must confirm before it becomes active.</p>
      <label>
        New email
        <input name="email" type="email" autoComplete="off" required />
      </label>
      <PasswordInput
        label="Your current password"
        name="currentPassword"
        autoComplete="current-password"
      />
      <button className="button-primary" disabled={pending}>
        Send confirmation
      </button>
      {message && <p role={message.startsWith('Check') ? 'status' : 'alert'}>{message}</p>}
    </form>
  );
}

function OwnAccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    action: 'change-email' | 'change-password',
  ) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const body =
        action === 'change-email'
          ? { email: values.get('email'), currentPassword: values.get('currentPassword') }
          : {
              currentPassword: values.get('currentPassword'),
              newPassword: values.get('newPassword'),
            };
      const response = await fetch(`/api/admin-auth/${action}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { message?: string };
      setMessage(result.message || 'Please try again.');
      if (response.ok) {
        form.reset();
        if (action === 'change-password') {
          router.replace('/login/');
          router.refresh();
        }
      }
    } catch {
      setMessage('The server is unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className={`${styles.panel} ${styles.ownSettings}`}
      aria-labelledby="own-account-heading"
    >
      <h2 id="own-account-heading">Your sign-in details</h2>
      <p className={styles.panelNote}>
        Current email: {email}. Changing it requires your password and confirmation at the new
        address.
      </p>
      {message && <p role="status">{message}</p>}
      <div className={styles.adminCards}>
        <form className={styles.authForm} onSubmit={(event) => void submit(event, 'change-email')}>
          <h3>Change email</h3>
          <label>
            New email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <PasswordInput
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
          />
          <button className="button-primary" disabled={pending}>
            Send confirmation
          </button>
        </form>
        <form
          className={styles.authForm}
          onSubmit={(event) => void submit(event, 'change-password')}
        >
          <h3>Change password</h3>
          <PasswordInput
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
          />
          <PasswordInput
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            minLength={12}
          />
          <button className="button-primary" disabled={pending}>
            Change password
          </button>
        </form>
      </div>
    </section>
  );
}
