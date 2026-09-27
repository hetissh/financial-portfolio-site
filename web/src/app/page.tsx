import { profileAbout, profileContact, contactEmailHref } from "@/lib/profile-sections";
import { MonogramText } from "@/components/MonogramText";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, ArrowRight, BookOpen, Compass, Layers } from "lucide-react";
import { loadContent } from "@/lib/content";
import { ResearchCard } from "@/components/ResearchCard";
import { ResearchRail } from "@/components/ResearchRail";
import styles from "./page.module.css";
export function generateMetadata(): Metadata { return { alternates: process.env.SITE_URL ? { canonical: "/" } : undefined }; }
export default function Home() {
  const { profile, research } = loadContent();
  const about = profileAbout(profile);
  const contact = profileContact(profile);
  const principleIcons = [Compass, Layers, BookOpen];
  const selected = research.filter((item) => item.featuredOrder !== undefined);
  const featured = selected.length ? selected : research;
  return <main id="main" className="wrap">
    <section className={styles.hero} aria-labelledby="top">
      <div className={styles.intro}><div className="eyebrow"><span className="status-dot" /> A curious mind. A considered view.</div><h1 id="top" tabIndex={-1}>{profile.headline}{" "}{profile.headlineAccent && <em>{profile.headlineAccent}</em>}</h1><p className={styles.lede}>{profile.intro}</p><div className={styles.heroActions}><a className="button-primary" href="#research">Explore my research <ArrowDown size={17} aria-hidden="true" /></a><a className="text-link" href="#about">A little about me <ArrowUpRight size={17} aria-hidden="true" /></a></div><div className={styles.interests}><span>THE THREADS I FOLLOW</span><p>Businesses <i /> Markets <i /> Decision-making</p></div></div>
      <div className={styles.desk} aria-label="An illustrated research notebook">
        <div className={styles.deskTop}><span>THE RESEARCH DESK</span><span>VOL. 01 / 2026</span></div>
        <div className={styles.orbit} aria-hidden="true"><svg viewBox="0 0 460 320" fill="none"><g stroke="currentColor"><ellipse cx="228" cy="154" rx="125" ry="74" transform="rotate(-26 228 154)"/><ellipse cx="228" cy="154" rx="125" ry="74" transform="rotate(26 228 154)"/><ellipse cx="228" cy="154" rx="74" ry="125"/><path d="M228 10v290M58 154h340" strokeDasharray="2 7" opacity=".4"/><circle cx="228" cy="154" r="42"/><circle cx="228" cy="154" r="5" fill="currentColor"/><circle cx="343" cy="116" r="5" fill="var(--paper)"/><circle cx="135" cy="218" r="5" fill="currentColor"/></g><g fill="currentColor" fontFamily="monospace" fontSize="9" letterSpacing="2"><text x="275" y="41">EVIDENCE</text><text x="15" y="230">PERSPECTIVE</text><text x="263" y="286">UNDERSTANDING</text></g></svg></div>
        <div className={styles.deskBottom}><span className={styles.deskQuote}>Look closer.<br /><em>Think deeper.</em></span><span className={styles.deskNumber} aria-hidden="true">↗</span></div><div className={styles.deskFoot}>A framework for asking better questions.<span aria-hidden="true">✳</span></div>
      </div>
    </section>
    <section id="research" className={styles.research} aria-labelledby="research-title"><div className="section-heading"><div><span className="eyebrow">01 / THE NOTEBOOK</span><h2 id="research-title">Selected <em>research.</em></h2></div><Link className="text-link" href="/research/">View all research <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      {featured.length ? <ResearchRail count={featured.length}>{featured.map((item, index) => <li key={item.id}><ResearchCard item={item} number={index + 1} /></li>)}</ResearchRail> : <div className="empty-state"><BookOpen size={28} aria-hidden="true" /><h3>The notebook is taking shape.</h3><p>Research will appear here as it is published.</p></div>}
    </section>
    <section id="about" className={styles.about} aria-labelledby="about-title"><div><span className="eyebrow">{about.label}</span><h2 id="about-title"><span className="editable-heading">{about.heading}</span>{about.accent && <> <em>{about.accent}</em></>}</h2><div className={styles.aboutStamp} aria-hidden="true"><span><MonogramText value={profile.monogram} /></span><div>{profile.displayName}<small>{profile.role}</small></div></div></div><div className={styles.aboutCopy}>{profile.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{about.principles.length > 0 && <div className={styles.principles}>{about.principles.map((principle, index) => { const Icon = principleIcons[index % principleIcons.length]; return <div key={index}><Icon size={20} strokeWidth={1.4} aria-hidden="true" /><span>{principle}</span></div>; })}</div>}{profile.resume && <a className="text-link" href={profile.resume} download>Download résumé <ArrowDown size={17} aria-hidden="true" /></a>}</div></section>
    <section id="contact" className={styles.contact} aria-labelledby="contact-title"><div><span className="eyebrow">{contact.label}</span><h2 id="contact-title"><span className="editable-heading">{contact.heading}</span>{contact.accent && <> <em>{contact.accent}</em></>}</h2></div><div className={styles.contactAside}>{profile.contactLinks.length || contact.email ? <><p>{contact.intro}</p>{contact.email && <a className="contact-link" href={contactEmailHref(contact.email, contact.emailSubject)}>{contact.emailLabel}<ArrowUpRight size={24} aria-hidden="true" /></a>}{profile.contactLinks.map((link) => <a key={link.href} className="contact-link" href={link.href}>{link.label}<ArrowUpRight size={24} aria-hidden="true" /></a>)}</> : <><p>{profile.contact ? contact.intro : <>Contact details are coming soon.<br />Until then, spend some time with the notebook.</>}</p><Link className="contact-link" href="/research/">Open the notebook <ArrowRight size={22} aria-hidden="true" /></Link></>}</div></section>
  </main>;
}
