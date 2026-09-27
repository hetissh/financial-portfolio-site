import { MonogramText } from "@/components/MonogramText";
import Link from "next/link";
import type { Profile } from "@/lib/content-schema";
export function SiteHeader({ profile, preview }: { profile: Profile; preview: boolean }) {
  return <>
    {preview && <div className="preview-note">Portfolio preview <span aria-hidden="true">·</span> Example research</div>}
    <header className="site-header wrap">
      <Link href="/" className="brand" aria-label={`${profile.displayName} home`}>
        <span className="monogram" aria-hidden="true"><MonogramText value={profile.monogram} /></span>
        <span>{profile.displayName}<span className="brand-role">{profile.role}</span></span>
      </Link>
      <nav aria-label="Main navigation"><Link href="/research/">Research</Link><Link href="/#about">About</Link><Link className="nav-contact" href="/#contact">Let’s connect <span aria-hidden="true">↗</span></Link></nav>
    </header>
  </>;
}
