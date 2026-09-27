import { releaseReadiness } from "@/lib/release-readiness";
import { MonogramText } from "@/components/MonogramText";
import Link from "next/link";
import { CircleAlert, CircleCheck, Eye, Info, PencilLine, Plus } from "lucide-react";
import { sortResearch, type Research } from "@/lib/content-schema";
import { formatDate } from "@/lib/content";
import { readAdminContent } from "@/lib/admin/store";
import styles from "@/components/admin/admin.module.css";

const statusLabel: Record<Research["status"], string> = { draft: "Draft", sample: "Example", published: "Published" };
function StatusBadge({ status }: { status: Research["status"] }) {
  return <span className={`${styles.badge} ${styles[`badge-${status}`]}`}>{statusLabel[status]}</span>;
}

export default function AdminOverview() {
  const { profile, research } = readAdminContent();
  const notes = sortResearch(research);
  const count = (status: Research["status"]) => notes.filter((item) => item.status === status).length;
  const { checks, notices } = releaseReadiness(profile, research, process.env.SITE_URL);
  const blockers = checks.filter((check) => !check.ok).length;
  return <main className={`wrap ${styles.page}`} id="main">
    <header className={styles.pageHead}>
      <div><span className="eyebrow">CONTENT DESK</span><h1 id="top" tabIndex={-1}>Edit the <em>notebook.</em></h1></div>
      <div>
        <p>Changes save to the JSON files in <code className={styles.code}>src/content</code> and appear on this local server straight away. To publish, commit the files and run a release build.</p>
        <Link className="button-primary" href="/admin/research/new/">New research note <Plus size={16} aria-hidden="true" /></Link>
      </div>
    </header>
    <div className={styles.dash}>
      <section className={styles.panel} aria-labelledby="notes-heading">
        <div className={styles.panelHead}>
          <h2 id="notes-heading">Research notes</h2>
          <span className="small-label">{count("published")} published · {count("sample")} examples · {count("draft")} drafts</span>
        </div>
        {notes.length ? <ul className={styles.noteList}>{notes.map((item) => <li key={item.id}>
          <span className={styles.order} title="Home order">{item.featuredOrder !== undefined ? `#${item.featuredOrder}` : "—"}</span>
          <div>
            <Link className={styles.noteTitle} href={`/admin/research/${encodeURIComponent(item.id)}/`}>{item.title}</Link>
            <span className={styles.noteMeta}>/research/{item.slug}/ · {item.category} · {formatDate(item.updatedAt ?? item.publishedAt)}</span>
          </div>
          <StatusBadge status={item.status} />
          <div className={styles.rowActions}>
            <Link href={`/admin/research/${encodeURIComponent(item.id)}/`} aria-label={`Edit ${item.title}`}><PencilLine size={14} aria-hidden="true" /> Edit</Link>
            <Link href={`/admin/research/${encodeURIComponent(item.id)}/preview/`} aria-label={`Preview ${item.title}`}><Eye size={14} aria-hidden="true" /> Preview</Link>
          </div>
        </li>)}</ul> : <div className={styles.empty}><strong>No research yet.</strong>Create a note to start the notebook.</div>}
        <p className={styles.panelNote}>Numbers show the home page order. Notes without one follow, newest first. Examples appear only in preview builds; drafts never appear.</p>
      </section>
      <div className={styles.stack}>
        <section className={styles.panel} aria-labelledby="release-heading">
          <h2 id="release-heading">Release</h2>
          <p className={styles.readiness}>{blockers ? `${blockers} ${blockers === 1 ? "item blocks" : "items block"} a production build.` : "Content is ready for a production build."}</p>
          <ul className={styles.checklist}>
            {checks.map((check) => <li key={check.title}>
              {check.ok ? <CircleCheck className={styles.ok} size={18} role="img" aria-label="Done" /> : <CircleAlert className={styles.blocked} size={18} role="img" aria-label="Blocking" />}
              <span>{check.title}<small>{check.detail}{check.href && <> <Link href={check.href}>{check.id === "profile" ? "Edit profile" : "Create a note"}</Link></>}</small></span>
            </li>)}
            {notices.map(notice => <li key={notice}><Info className={styles.info} size={18} role="img" aria-label="Note" /><span>{notice}</span></li>)}
          </ul>
        </section>
        <section className={styles.panel} aria-labelledby="profile-heading">
          <div className={styles.panelHead}><h2 id="profile-heading">Profile</h2><Link className="text-link" href="/admin/profile/" aria-label="Edit profile">Edit <PencilLine size={14} aria-hidden="true" /></Link></div>
          <div className={styles.profileCard}><span className="monogram" aria-hidden="true"><MonogramText value={profile.monogram} /></span><div><strong>{profile.displayName}</strong><span>{profile.role}</span></div></div>
          <dl className={styles.profileFacts}>
            <div><dt>Status</dt><dd>{profile.isPlaceholder ? "Placeholder" : "Approved"}</dd></div>
            <div><dt>Contact links</dt><dd>{profile.contactLinks.length || "None"}</dd></div>
            <div><dt>Résumé</dt><dd>{profile.resume ?? "None"}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  </main>;
}
