// Renders site identity and primary public navigation.
import { MonogramText } from '@/components/MonogramText';
import Link from 'next/link';
import type { Profile } from '@/lib/content-schema';
import { AdminEntry } from './AdminEntry';
import { profileJourney } from '@/lib/profile-sections';
import { runtimeSetting } from '@/lib/runtime-env';
export function SiteHeader({ profile, preview }: { profile: Profile; preview: boolean }) {
  const journey = profileJourney(profile);
  return (
    <>
      {preview && (
        <div className="preview-note">
          Portfolio preview <span aria-hidden="true">·</span> Example research
        </div>
      )}
      <header className="site-header wrap">
        <Link href="/" className="brand" aria-label={`${journey.title} home`}>
          <span className="monogram" aria-hidden="true">
            <MonogramText value={profile.monogram} />
          </span>
          <span>
            {journey.title}
            <span className="brand-role">{profile.role}</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/research/">Research</Link>
          {(profile.contact?.email || profile.contactLinks.length > 0) && (
            <a href="#contact">Contact</a>
          )}
          {((profile.resumeVisible && profile.resume) ||
            profile.certifications.some((item) => item.visible)) && (
            <Link href="/#credentials">Credentials</Link>
          )}
          {runtimeSetting('PORTFOLIO_ADMIN') === '1' && <AdminEntry />}
        </nav>
      </header>
    </>
  );
}
