// Gives homepage copy a direct admin destination while reusing the saved profile editor.
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { adminContent } from '@/lib/admin/data-source';
import { requireAdminPage } from '@/lib/admin/auth';
import { ProfileEditor } from '@/components/admin/ProfileEditor';
import styles from '@/components/admin/admin.module.css';

export const metadata: Metadata = { title: 'Homepage' };

export default async function AdminHomepage() {
  await requireAdminPage();
  const { profile, profileVersion } = await adminContent();
  return (
    <main className={`wrap ${styles.page}`} id="main">
      <header className={styles.pageHead}>
        <div>
          <Link className={`text-link ${styles.backLink}`} href="/admin/">
            <ArrowLeft size={16} aria-hidden="true" /> Overview
          </Link>
          <span className="eyebrow">HOMEPAGE</span>
          <h1 id="top" tabIndex={-1}>
            Shape the <em>first impression.</em>
          </h1>
        </div>
        <p>
          Edit the portfolio title, hero description and research introduction. The preview updates
          as you type.
        </p>
      </header>
      <ProfileEditor profile={profile} version={profileVersion} mode="home" />
    </main>
  );
}
