// Applies the protected admin shell without adding admin routes to the public export.
import type { Metadata } from 'next';
import { requireAdminPage } from '@/lib/admin/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className={styles.shell} data-admin-shell>
      <div className={`wrap ${styles.bar}`}>
        <span className={styles.barLabel}>
          <span className="status-dot" aria-hidden="true" /> {admin.name} · content desk
        </span>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
