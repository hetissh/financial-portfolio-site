"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
export function ResearchRail({ children, count }: { children: ReactNode; count: number }) {
  const rail = useRef<HTMLUListElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: count <= 1, overflow: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setBounds({ start: element.scrollLeft <= 2,
      end: element.scrollLeft >= element.scrollWidth - element.clientWidth - 2,
      overflow: element.scrollWidth > element.clientWidth + 2 });
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", update, { passive: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [count]);
  function move(direction: -1 | 1) {
    const element = rail.current;
    if (!element) return;
    const left = element.scrollLeft;
    const start = element.getBoundingClientRect().left;
    const padding = parseFloat(getComputedStyle(element).paddingLeft);
    const offsets = Array.from(element.children).map((child) => child.getBoundingClientRect().left - start + left - padding);
    const next = direction === 1 ? offsets.find((offset) => offset > left + 3) : offsets.findLast((offset) => offset < left - 3);
    const target = next ?? (direction === 1 ? element.scrollWidth : 0);
    element.scrollTo({ left: Math.max(0, Math.min(target, element.scrollWidth - element.clientWidth)),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className="rail-shell">
    <ul ref={rail} id="research-rail" className="research-rail" aria-label="Selected research" onFocusCapture={(event) => {
      const element = rail.current;
      const item = (event.target as HTMLElement).closest("li");
      if (!element || !item) return;
      const box = item.getBoundingClientRect(); const viewport = element.getBoundingClientRect();
      if (box.left < viewport.left || box.right > viewport.right) {
        element.scrollTo({ left: element.scrollLeft + box.left - viewport.left - parseFloat(getComputedStyle(element).paddingLeft), behavior: "instant" });
      }
    }}>{children}</ul>
    {count > 1 && <div className="rail-toolbar"><span className="small-label">{String(count).padStart(2, "0")} notes to explore</span><div className="rail-buttons" hidden={!bounds.overflow}>
      <button aria-label="Previous research" aria-controls="research-rail" disabled={bounds.start} onClick={() => move(-1)}><ArrowLeft size={19} aria-hidden="true" /></button>
      <button aria-label="Next research" aria-controls="research-rail" disabled={bounds.end} onClick={() => move(1)}><ArrowRight size={19} aria-hidden="true" /></button>
    </div></div>}
  </div>;
}
