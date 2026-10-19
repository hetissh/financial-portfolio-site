// Presents the profile's saved contact methods on public pages.
import { ArrowUpRight } from 'lucide-react';
import type { Profile } from '@/lib/content-schema';

export function ContactCredentials({ profile }: { profile: Profile }) {
  const email = profile.contact?.email;
  if (!email && !profile.contactLinks.length) return null;

  const emailSubject = encodeURIComponent(profile.contact?.emailSubject ?? 'Hello');
  return (
    <section id="contact" className="professional-details wrap" aria-labelledby="contact-title">
      <div className="professional-heading">
        <span className="eyebrow">02 / CONNECT</span>
        <h2 id="contact-title">
          Beyond the <em>numbers.</em>
        </h2>
        <p>For questions, collaboration, or a thoughtful conversation.</p>
      </div>
      {(email || profile.contactLinks.length) && (
        <div className="professional-links" aria-label="Contact and profile links">
          {email && (
            <a href={`mailto:${email}?subject=${emailSubject}`}>
              <span>{profile.contact?.emailLabel || 'Email me'}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
          {profile.contactLinks.map((link, index) => (
            <a href={link.href} key={`${link.href}-${index}`}>
              <span>{link.label}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
