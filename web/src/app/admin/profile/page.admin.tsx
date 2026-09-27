import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { readAdminContent } from "@/lib/admin/store";
import { ProfileEditor } from "@/components/admin/ProfileEditor";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Profile" };
export default function AdminProfile() {
  const { profile, profileVersion } = readAdminContent();
  return <main className={`wrap ${styles.page}`} id="main">
    <header className={styles.pageHead}>
      <div><Link className={`text-link ${styles.backLink}`} href="/admin/"><ArrowLeft size={16} aria-hidden="true" /> Overview</Link><span className="eyebrow">PROFILE</span><h1 id="top" tabIndex={-1}>{profile.displayName}<span className="green-period">.</span></h1></div>
      <div><p>Your name, introduction, biography, and contact links. Production builds stay blocked until the profile is approved.</p></div>
    </header>
    <ProfileEditor profile={profile} version={profileVersion} />
  </main>;
}
