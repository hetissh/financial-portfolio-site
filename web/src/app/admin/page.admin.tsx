// Shows real content status, direct editing actions, research order, and release readiness.
import { ResearchOrganizer } from '@/components/admin/ResearchOrganizer';
import { releaseReadiness } from '@/lib/release-readiness';
import { MonogramText } from '@/components/MonogramText';
import Link from 'next/link';
import { ArrowUpRight, CircleAlert, CircleCheck, Info, Plus } from 'lucide-react';
import { adminContent } from '@/lib/admin/data-source';
import { requireAdminPage } from '@/lib/admin/auth';
import styles from '@/components/admin/admin.module.css';

export default async function AdminOverview() {
  await requireAdminPage();
  const { profile, research: notes, orderVersion } = await adminContent();
  const portfolioTitle = profile.portfolioTitle || profile.displayName;
  const count = (status: (typeof notes)[number]['status']) =>
    notes.filter((item) => item.status === status).length;
  const { checks, notices } = releaseReadiness(profile, notes, process.env.SITE_URL);
  const blockers = checks.filter((check) => !check.ok);

  return (
    <main className={`wrap ${styles.page} ${styles.overviewPage}`} id="main">
      <header className={styles.overviewHero}>
        <div className={styles.overviewHeroCopy}>
          <span className="eyebrow">PORTFOLIO / CONTENT DESK</span>
          <h1 id="top" tabIndex={-1}>
            Your portfolio, <em>in view.</em>
          </h1>
          <p>Shape the first impression, arrange your research, and see what is ready to share.</p>
          <div className={styles.overviewActions}>
            <Link className="button-primary" href="/admin/home/">
              Edit homepage <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link className={styles.overviewViewSite} href="/">
              View site <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className={styles.overviewCardScene} aria-hidden="true">
          <div className={styles.overviewCard}>
            <span className={styles.overviewCardMark}>
              <MonogramText value={profile.monogram} />
            </span>
            <span className={styles.overviewCardBrand}>{portfolioTitle}</span>
            <span className={styles.overviewCardChip} />
            <strong>Look closer.</strong>
            <small>FINANCE / RESEARCH / PERSPECTIVE</small>
          </div>
        </div>
      </header>

      <section className={styles.overviewMetrics} aria-label="Content status">
        <div className={styles.overviewMetric}>
          <span>Published research</span>
          <strong>{count('published')}</strong>
          <small>Visible in a production build</small>
        </div>
        <div className={styles.overviewMetric}>
          <span>Drafts in progress</span>
          <strong>{count('draft')}</strong>
          <small>Only available to admins</small>
        </div>
        <div className={styles.overviewMetric} data-state={blockers.length ? 'blocked' : 'ready'}>
          <span>Release readiness</span>
          <strong>{blockers.length ? `${blockers.length} to resolve` : 'Ready'}</strong>
          <small>{blockers.length ? 'Review the checks below' : 'Content checks passed'}</small>
        </div>
      </section>

      <div className={styles.overviewGrid}>
        <section className={styles.panel} aria-labelledby="notes-heading">
          <div className={styles.panelHead}>
            <div>
              <span className={styles.panelKicker}>01 / THE NOTEBOOK</span>
              <h2 id="notes-heading">Research notes</h2>
            </div>
            <Link
              className={styles.overviewAddNote}
              href="/admin/research/new/"
              aria-label="New research note"
            >
              <Plus size={16} aria-hidden="true" /> New note
            </Link>
          </div>
          <p className={styles.overviewSectionIntro}>
            Arrange the reading order. {count('sample')} example notes are available in preview
            only.
          </p>
          {notes.length ? (
            <ResearchOrganizer
              notes={notes.map(
                ({ id, slug, title, category, status, theme, cover, noteNumber }) => ({
                  id,
                  slug,
                  title,
                  category,
                  status,
                  theme,
                  cover,
                  noteNumber,
                }),
              )}
              version={orderVersion}
            />
          ) : (
            <div className={styles.empty}>
              <strong>No research yet.</strong>Create a note to start the notebook.
            </div>
          )}
          <details className={styles.overviewDetails}>
            <summary>How ordering works</summary>
            <p>
              The saved order is shared by the notebook and selected home cards. Cover numbers
              update automatically unless a note has its own number. Examples appear only in preview
              builds; drafts never appear.
            </p>
          </details>
        </section>

        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="homepage-heading">
            <span className={styles.panelKicker}>02 / FIRST IMPRESSION</span>
            <h2 id="homepage-heading">Homepage</h2>
            <p className={styles.overviewSectionIntro}>The words visitors see first.</p>
            <div className={styles.overviewHomepageCopy}>
              <strong>{portfolioTitle}</strong>
              <p>{profile.intro}</p>
            </div>
            <Link className={styles.overviewPanelLink} href="/admin/home/">
              Edit homepage <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>

          <section className={styles.panel} aria-labelledby="release-heading">
            <span className={styles.panelKicker}>03 / RELEASE</span>
            <h2 id="release-heading">Release status</h2>
            <p className={styles.overviewSectionIntro}>
              {blockers.length
                ? `${blockers.length} ${blockers.length === 1 ? 'item needs' : 'items need'} attention before a production build.`
                : 'Content is ready for a production build.'}
            </p>
            {blockers.length ? (
              <ul className={styles.checklist}>
                {blockers.map((check) => (
                  <li key={check.title}>
                    <CircleAlert
                      className={styles.blocked}
                      size={18}
                      role="img"
                      aria-label="Blocking"
                    />
                    <span>
                      {check.title}
                      <small>
                        {check.detail}
                        {check.href && (
                          <>
                            {' '}
                            <Link href={check.href}>
                              {check.id === 'profile' ? 'Edit profile' : 'Create a note'}
                            </Link>
                          </>
                        )}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.overviewReady}>
                <CircleCheck size={18} aria-hidden="true" /> All required checks pass.
              </p>
            )}
            <details className={styles.overviewDetails}>
              <summary>All release checks</summary>
              <ul className={styles.checklist}>
                {checks.map((check) => (
                  <li key={check.title}>
                    {check.ok ? (
                      <CircleCheck className={styles.ok} size={18} role="img" aria-label="Done" />
                    ) : (
                      <CircleAlert
                        className={styles.blocked}
                        size={18}
                        role="img"
                        aria-label="Blocking"
                      />
                    )}
                    <span>
                      {check.title}
                      <small>
                        {check.detail}
                        {check.href && (
                          <>
                            {' '}
                            <Link href={check.href}>
                              {check.id === 'profile' ? 'Edit profile' : 'Create a note'}
                            </Link>
                          </>
                        )}
                      </small>
                    </span>
                  </li>
                ))}
                {notices.map((notice) => (
                  <li key={notice}>
                    <Info className={styles.info} size={18} role="img" aria-label="Note" />
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
