import type { Profile, Research } from './content-schema';

export function validProductionOrigin(value: string | undefined): boolean {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
  } catch { return false; }
}

export function releaseReadiness(profile: Profile, records: Research[], siteUrl: string | undefined) {
  const published = records.filter(note => note.status === 'published').length;
  const samples = records.filter(note => note.status === 'sample').length;
  const drafts = records.filter(note => note.status === 'draft').length;
  const checks = [
    { id: 'profile', ok: !profile.isPlaceholder, title: 'Profile approved', detail: profile.isPlaceholder ? 'Review Admin → Profile, tick “Approved for release” and save.' : 'Marked as reviewed.', error: 'Replace and approve the placeholder profile before a production build.', href: '/admin/profile/' },
    { id: 'address', ok: validProductionOrigin(siteUrl), title: 'Production address', detail: validProductionOrigin(siteUrl) ? `SITE_URL: ${siteUrl}` : 'Set SITE_URL to the production HTTPS origin when starting admin or running a release command.', error: 'SITE_URL must be your production HTTPS origin, without credentials, a path, query or fragment.' },
    { id: 'research', ok: published > 0, title: 'At least one published note', detail: published ? `${published} published. Citations are optional.` : 'Set a finished note’s status to Published. Sources are optional.', error: 'Add at least one approved, published research item before a production build.', href: '/admin/research/new/' },
  ];
  return { checks, ready: checks.every(check => check.ok), published, samples, drafts,
    notices: [
      ...(!profile.contact?.email && !profile.contactLinks.length ? ['No contact email or links are configured. Add them in Admin → Profile if visitors should be able to contact you.'] : []),
      ...(samples || drafts ? [`${samples} sample and ${drafts} draft notes are excluded from production.`] : []),
      'Citations and résumé are optional. Supplied source links are validated.',
    ],
  };
}
