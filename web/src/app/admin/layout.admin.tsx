import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { adminEnabled, isLocalHost } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin" }, robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminEnabled() || !isLocalHost((await headers()).get("host"))) notFound();
  return <div className={styles.shell}>
    <div className={`wrap ${styles.bar}`}>
      <span className={styles.barLabel}><span className="status-dot" aria-hidden="true" /> Local admin · edits src/content</span>
      <AdminNav />
    </div>
    {children}
  </div>;
}
