import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResearchRail } from '../../src/components/ResearchRail';
describe('rail progressive enhancement', () => {
  it.each([0, 1])('omits arrow controls for %i items', (count) => {
    const html = renderToStaticMarkup(<ResearchRail count={count}>{count ? <li>Only note</li> : null}</ResearchRail>);
    expect(html).not.toContain('<button');
  });
  it('renders the readable list before JavaScript, with controls initially hidden', () => {
    const html = renderToStaticMarkup(<ResearchRail count={2}><li>First note</li><li>Second note</li></ResearchRail>);
    expect(html).toContain('First note');
    expect(html).toContain('Second note');
    expect(html).toContain('hidden=""');
  });
});
