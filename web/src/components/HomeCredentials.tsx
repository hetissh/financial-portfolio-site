// Shows the profile's résumé and certifications as a dedicated home-page section.
import { ArrowUpRight, FileText } from 'lucide-react';
import type { Profile } from '@/lib/content-schema';
import { visitorAssetUrl } from '@/lib/supabase/assets';

function monthYear(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function HomeCredentials({ profile }: { profile: Profile }) {
  const certifications = profile.certifications.filter((item) => item.visible);
  const resume = profile.resumeVisible ? profile.resume : undefined;
  if (!resume && certifications.length === 0) return null;

  return (
    <section
      id="credentials"
      className="professional-details home-credentials wrap"
      aria-labelledby="credentials-title"
    >
      <div className="professional-heading">
        <span className="eyebrow">02 / CREDENTIALS</span>
        <h2 id="credentials-title">
          Work, backed by <em>experience.</em>
        </h2>
        <p>Résumé and certifications, kept together for a closer look.</p>
      </div>
      <div className="home-credential-items">
        {resume && (
          <a href={visitorAssetUrl(resume)} target="_blank" rel="noopener noreferrer">
            <span>{profile.resumeLabel || 'View résumé'}</span>
            <FileText size={18} aria-hidden="true" />
          </a>
        )}
        {certifications.length > 0 && (
          <div className="professional-certifications">
            <h3>Certifications</h3>
            <ul>
              {certifications.map((item, index) => (
                <li key={`${item.name}-${item.issuer}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.issuer}
                      {item.issuedAt ? ` · ${monthYear(item.issuedAt)}` : ''}
                    </span>
                    {item.credentialId && <small>ID {item.credentialId}</small>}
                    {item.expiresAt && <small>Expires {monthYear(item.expiresAt)}</small>}
                  </div>
                  {(item.url || item.pdf) && (
                    <div className="professional-certificate-actions">
                      {item.pdf && (
                        <a
                          href={visitorAssetUrl(item.pdf)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          PDF <FileText size={16} aria-hidden="true" />
                        </a>
                      )}
                      {item.url && (
                        <a href={item.url} aria-label={`Verify ${item.name}`}>
                          Verify <ArrowUpRight size={16} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
