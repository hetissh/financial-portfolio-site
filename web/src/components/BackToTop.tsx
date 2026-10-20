// Returns readers to the page top while restoring useful keyboard focus.
'use client';
import { ArrowUp } from 'lucide-react';
export function BackToTop() {
  return (
    <a
      className="back-top"
      href="#top"
      onClick={(event) => {
        event.preventDefault();
        document.getElementById('top')?.focus({ preventScroll: true });
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}#top`,
        );
        if (reduced) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          return;
        }
        // Drive the short scroll directly so WebKit can finish it across the sticky journey.
        const start = window.scrollY;
        const startedAt = performance.now();
        const duration = 520;
        const move = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - (1 - progress) ** 3;
          window.scrollTo(0, Math.round(start * (1 - eased)));
          if (progress < 1) window.requestAnimationFrame(move);
          else window.scrollTo(0, 0);
        };
        window.requestAnimationFrame(move);
      }}
    >
      Back to top <ArrowUp size={16} aria-hidden="true" />
    </a>
  );
}
