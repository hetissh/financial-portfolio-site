import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadContent } from "@/lib/content";
import { ResearchCard } from "@/components/ResearchCard";
export function generateMetadata(): Metadata { return { title: "The research notebook", description: "Research notes on businesses, assumptions, and asking better questions.", alternates: process.env.SITE_URL ? { canonical: "/research/" } : undefined }; }
export default function ResearchIndex() {
  const { research, mode } = loadContent();
  return <main className="wrap index-page" id="main"><Link className="text-link back-link" href="/"><ArrowLeft size={17} aria-hidden="true" /> Back home</Link><div className="index-heading"><div><span className="eyebrow">THE NOTEBOOK</span><h1 id="top" tabIndex={-1}>Ideas worth<br /><em>looking into.</em></h1></div><div><p>A collection of questions, frameworks, and considered perspectives.</p><span className="small-label">{research.length} {research.length === 1 ? "NOTE" : "NOTES"}{mode === "preview" ? " · INCLUDES EXAMPLES" : ""}</span></div></div>{research.length ? <ul className="research-grid">{research.map((item, index) => <li key={item.id}><ResearchCard item={item} number={index + 1} /></li>)}</ul> : <div className="empty-state"><h2>The notebook is taking shape.</h2><p>Research will appear here as it is published.</p></div>}</main>;
}
