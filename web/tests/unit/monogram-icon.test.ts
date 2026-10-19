// Confirms saved initials produce distinct, XML-safe browser icons.
import { expect, it } from 'vitest';
import { monogramIconDataUrl } from '../../src/lib/monogram-icon';

it('changes with the monogram and escapes characters that could alter SVG markup', () => {
  const first = monogramIconDataUrl('A');
  const second = monogramIconDataUrl('ABC');
  expect(first).not.toBe(second);
  expect(decodeURIComponent(second.split(',')[1])).toContain('>ABC</text>');
  const escaped = decodeURIComponent(monogramIconDataUrl('<&').split(',')[1]);
  expect(escaped).toContain('&lt;&amp;</text>');
  expect(escaped).not.toContain('<&');
});
