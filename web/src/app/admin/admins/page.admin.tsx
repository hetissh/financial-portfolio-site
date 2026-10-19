// Lists the only two admin account slots and provides controlled access changes.
import { cloudAdminEnabled, requireAdminPage } from '@/lib/admin/auth';
import { publicAdmins } from '@/lib/admin/auth-store';
import { cloudPublicAdmins } from '@/lib/supabase/admin-auth';
import { AdminAccounts } from '@/components/admin/AdminAccounts';
import styles from '@/components/admin/admin.module.css';

export const metadata = { title: 'Admin management' };
export default async function AdminManagementPage() {
  const current = await requireAdminPage();
  return (
    <main className={`wrap ${styles.page}`} id="main">
      <header className={styles.pageHead}>
        <div>
          <span className="eyebrow">ADMIN MANAGEMENT</span>
          <h1>Two accounts.</h1>
        </div>
        <p>
          The two account slots are fixed. Removing access disables an account and ends its
          sessions; the other admin can restore it.
        </p>
      </header>
      <AdminAccounts
        initial={cloudAdminEnabled() ? await cloudPublicAdmins() : publicAdmins()}
        currentId={current.id}
      />
    </main>
  );
}
