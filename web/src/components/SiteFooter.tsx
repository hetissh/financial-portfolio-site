import Link from "next/link";
import { BackToTop } from "./BackToTop";
export function SiteFooter({ name }: { name: string }) {
  return <footer className="site-footer wrap"><div><Link href="/">{name}<span className="footer-dot">.</span></Link><span>A notebook, always in progress.</span><span className="pattern-credit">Patterns by <a href="https://heropatterns.com/">Steve Schoger</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · colours adapted</span></div><nav className="footer-actions" aria-label="Footer">{process.env.PORTFOLIO_ADMIN === "1" && <Link className="text-link" href="/admin/">Admin</Link>}<BackToTop /></nav></footer>;
}
