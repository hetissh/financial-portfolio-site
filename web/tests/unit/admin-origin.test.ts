// Keeps hosted admin routing safe and tolerant of normalized origin formatting.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { allowedAdminOrigin } from '../../src/lib/admin/auth';

afterEach(() => vi.unstubAllEnvs());

describe('configured admin origin', () => {
  it('accepts an HTTPS origin with or without a trailing slash', () => {
    vi.stubEnv('PORTFOLIO_ADMIN', '1');
    vi.stubEnv('ADMIN_ORIGIN', 'https://financial-portfolio-site.example/');
    expect(allowedAdminOrigin('financial-portfolio-site.example')).toBe(
      'https://financial-portfolio-site.example',
    );
  });

  it('fails closed on malformed or non-origin values without throwing', () => {
    vi.stubEnv('PORTFOLIO_ADMIN', '1');
    for (const configured of [
      'not a URL',
      'http://financial-portfolio-site.example',
      'https://financial-portfolio-site.example/admin/',
      'https://user:password@financial-portfolio-site.example',
    ]) {
      vi.stubEnv('ADMIN_ORIGIN', configured);
      expect(() => allowedAdminOrigin('financial-portfolio-site.example')).not.toThrow();
      expect(allowedAdminOrigin('financial-portfolio-site.example')).toBeUndefined();
    }
  });
});
