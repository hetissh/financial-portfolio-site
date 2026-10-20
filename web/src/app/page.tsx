// Builds the public home page from validated profile and visible research.
import { profileJourney } from '@/lib/profile-sections';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { CardJourney } from '@/components/CardJourney';
import { loadPublicContent } from '@/lib/content';
import { ResearchCard } from '@/components/ResearchCard';
import { ResearchRail } from '@/components/ResearchRail';
import { HomeCredentials } from '@/components/HomeCredentials';
import styles from './page.module.css';
import { runtimeSetting } from '@/lib/runtime-env';
export function generateMetadata(): Metadata {
  return { alternates: runtimeSetting('SITE_URL') ? { canonical: '/' } : undefined };
}
export default async function Home() {
  const { profile, research } = await loadPublicContent();
  const journey = profileJourney(profile);
  const selected = research.filter((item) => item.featuredOrder !== undefined);
  const featured = selected.length ? selected : research;
  return (
    <main id="main">
      <CardJourney copy={journey} monogram={profile.monogram} />
      <div className="wrap">
        <section id="research" className={styles.research} aria-labelledby="research-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / THE NOTEBOOK</span>
              <h2 id="research-title">
                Selected <em>research.</em>
              </h2>
            </div>
            <Link className="text-link" href="/research/">
              View all research <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {featured.length ? (
            <ResearchRail count={featured.length}>
              {featured.map((item) => (
                <li key={item.id}>
                  <ResearchCard
                    item={item}
                    number={research.findIndex((note) => note.id === item.id) + 1}
                  />
                </li>
              ))}
            </ResearchRail>
          ) : (
            <div className="empty-state">
              <BookOpen size={28} aria-hidden="true" />
              <h3>The notebook is taking shape.</h3>
              <p>Research will appear here as it is published.</p>
            </div>
          )}
        </section>
      </div>
      <HomeCredentials profile={profile} />
    </main>
  );
}
