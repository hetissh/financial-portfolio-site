import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResearchEditor } from "@/components/admin/ResearchEditor";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "New note" };
export default function NewResearch() {
  return <main className={`wrap ${styles.page}`} id="main">
    <header className={styles.pageHead}>
      <div><Link className={`text-link ${styles.backLink}`} href="/admin/"><ArrowLeft size={16} aria-hidden="true" /> Overview</Link><span className="eyebrow">NEW NOTE</span><h1 id="top" tabIndex={-1}>Start a <em>note.</em></h1></div>
      <div><p>New notes start as drafts, which never appear on the site. Switch to Published when the note is ready. Sources are optional.</p></div>
    </header>
    <ResearchEditor />
  </main>;
}
