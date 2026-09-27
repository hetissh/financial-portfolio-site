"use client";
import { ArrowUp } from "lucide-react";
export function BackToTop() {
  return <a className="back-top" href="#top" onClick={(event) => {
    event.preventDefault();
    document.getElementById("top")?.focus({ preventScroll: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#top`);
    window.scrollTo({ top: 0, left: 0, behavior: reduced ? "instant" : "smooth" });
  }}>Back to top <ArrowUp size={16} aria-hidden="true" /></a>;
}
