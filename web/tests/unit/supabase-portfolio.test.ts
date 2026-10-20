// Verifies that Supabase rows cannot bypass publication and schema boundaries.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePublicPortfolio } from '../../src/lib/supabase/portfolio';
import { visitorAssetUrl } from '../../src/lib/supabase/assets';

const profile = {
  ...JSON.parse(readFileSync('src/content/profile.json', 'utf8')),
  isPlaceholder: true,
};
const note = JSON.parse(readFileSync('tests/fixtures/research-note.json', 'utf8'));

describe('Supabase public content', () => {
  it('requires an approved profile and excludes unpublished notes', () => {
    const approved = { ...profile, isPlaceholder: false };
    const published = { ...note, id: 'public', slug: 'public', status: 'published' };
    const draft = { ...note, id: 'draft', slug: 'draft', status: 'draft' };
    expect(() => parsePublicPortfolio({ id: 1, body: profile, version: 1 }, [], null)).toThrow(
      'not approved',
    );
    const result = parsePublicPortfolio(
      { id: 1, body: approved, version: 1 },
      [published, draft].map((body) => ({
        id: body.id,
        slug: body.slug,
        status: body.status,
        body,
        version: 1,
      })),
      { id: 1, note_ids: ['draft', 'public'], version: 1 },
    );
    expect(result.research.map((entry) => entry.id)).toEqual(['public']);
  });

  it('rejects a row whose indexed fields differ from its content', () => {
    expect(() =>
      parsePublicPortfolio(
        { id: 1, body: { ...profile, isPlaceholder: false }, version: 1 },
        [{ id: note.id, slug: 'wrong-slug', status: note.status, body: note, version: 1 }],
        null,
      ),
    ).toThrow('does not match');
  });
});

it('routes published media through the public bucket and rejects path traversal', () => {
  const previous = {
    source: process.env.PORTFOLIO_DATA_SOURCE,
    url: process.env.SUPABASE_URL,
  };
  try {
    process.env.PORTFOLIO_DATA_SOURCE = 'supabase';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    expect(visitorAssetUrl('/images/covers/example.webp')).toBe(
      'https://example.supabase.co/storage/v1/object/public/portfolio-public/images/covers/example.webp',
    );
    expect(() => visitorAssetUrl('/../portfolio-private/secret.webp')).toThrow(
      'Invalid public asset path',
    );
  } finally {
    for (const [name, value] of [
      ['PORTFOLIO_DATA_SOURCE', previous.source],
      ['SUPABASE_URL', previous.url],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
