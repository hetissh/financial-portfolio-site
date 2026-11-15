// Covers metadata URL fallbacks and the static favicon asset without external services.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalPath, configuredMetadataOrigin, metadataBase } from '../../src/lib/metadata-url';

describe('metadata origin handling', () => {
  it('accepts HTTPS origins and local development origins', () => {
    expect(configuredMetadataOrigin('https://portfolio.example')?.origin).toBe(
      'https://portfolio.example',
    );
    expect(configuredMetadataOrigin('http://127.0.0.1:3000')?.origin).toBe('http://127.0.0.1:3000');
  });

  it('falls back safely and omits canonicals for invalid origins', () => {
    for (const value of [
      'portfolio.example',
      'https://portfolio.example/path',
      'javascript:alert(1)',
    ]) {
      expect(configuredMetadataOrigin(value)).toBeUndefined();
      expect(canonicalPath(value, '/')).toBeUndefined();
    }
    expect(metadataBase('portfolio.example').origin).toBe('http://127.0.0.1:4173');
    expect(canonicalPath('https://portfolio.example', '/research/')).toEqual({
      canonical: '/research/',
    });
  });
});

it('provides a valid conventional favicon asset', () => {
  const icon = readFileSync(path.resolve(process.cwd(), 'public/favicon.ico'));
  expect(icon.readUInt16LE(0)).toBe(0);
  expect(icon.readUInt16LE(2)).toBe(1);
  expect(icon.readUInt16LE(4)).toBe(1);
  expect(icon.readUInt32LE(14)).toBeGreaterThan(0);
});
