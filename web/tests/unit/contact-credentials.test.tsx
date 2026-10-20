// Checks that saved professional details render only when visible content exists.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { profileSchema } from '../../src/lib/content-schema';
import { ContactCredentials } from '../../src/components/ContactCredentials';
import { HomeCredentials } from '../../src/components/HomeCredentials';

const profile = profileSchema.parse(JSON.parse(readFileSync('src/content/profile.json', 'utf8')));

describe('public professional details', () => {
  it('does not add an empty section to the current site', () => {
    const emptyContactProfile = profileSchema.parse({
      ...profile,
      contact: {
        label: 'Contact',
        heading: 'Hello',
        accent: '',
        intro: 'Say hello',
        email: undefined,
        emailLabel: 'Email',
        emailSubject: 'Research question',
      },
      contactLinks: [],
    });
    expect(renderToStaticMarkup(<ContactCredentials profile={emptyContactProfile} />)).toBe('');
  });
  it('shows saved links, résumé and visible certifications', () => {
    const sample = profileSchema.parse({
      ...profile,
      contact: {
        label: 'Contact',
        heading: 'Hello',
        accent: '',
        intro: 'Say hello',
        email: 'hello@example.com',
        emailLabel: 'Email',
        emailSubject: 'Research question',
      },
      contactLinks: [{ label: 'LinkedIn', href: 'https://example.com/profile' }],
      resume: '/downloads/resume.pdf',
      resumeLabel: 'Read my CV',
      resumeVisible: true,
      certifications: [
        {
          name: 'Financial Modelling',
          issuer: 'Example Institute',
          issuedAt: '2026-02-01',
          visible: true,
          url: 'https://example.com/verify',
          pdf: '/downloads/certifications/00000000-0000-4000-8000-000000000001.pdf',
        },
        { name: 'Hidden', issuer: 'Example Institute', visible: false },
      ],
    });
    const markup = renderToStaticMarkup(<ContactCredentials profile={sample} />);
    expect(markup).toContain('mailto:hello@example.com?subject=Research%20question');
    expect(markup).toContain('LinkedIn');
    const credentials = renderToStaticMarkup(<HomeCredentials profile={sample} />);
    expect(credentials).toContain('Read my CV');
    expect(credentials).toContain('Financial Modelling');
    expect(credentials).toContain('Verify');
    expect(credentials).toContain('PDF');
    expect(credentials).toContain(
      '/downloads/certifications/00000000-0000-4000-8000-000000000001.pdf',
    );
    expect(credentials).not.toContain('Hidden');
  });
});
