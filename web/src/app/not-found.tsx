import Link from "next/link";
import { ArrowRight } from "lucide-react";
export default function NotFound() { return <main id="main" className="wrap not-found"><span className="eyebrow">404 / A MISSING PAGE</span><h1 id="top" tabIndex={-1}>A little<br /><em>off the page.</em></h1><p>This page may have moved, or the note hasn’t been published yet.</p><Link className="button-primary" href="/research/">Back to the notebook <ArrowRight size={18} aria-hidden="true" /></Link><Link className="text-link" href="/">Return home</Link></main>; }
