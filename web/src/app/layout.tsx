// Defines the public document shell, metadata, fonts, and shared navigation.
import type { Metadata } from 'next';
import { runtimeSetting } from '@/lib/runtime-env';
import localFont from 'next/font/local';
const bodyFont = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-body',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
const editorialFont = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-editorial',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
import './globals.css';
import { loadPublicContent } from '@/lib/content';
import { monogramIconDataUrl } from '@/lib/monogram-icon';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactCredentials } from '@/components/ContactCredentials';
import { profileJourney } from '@/lib/profile-sections';
export async function generateMetadata(): Promise<Metadata> {
  const { profile, mode } = await loadPublicContent();
  const title = profileJourney(profile).title;
  const origin = new URL(runtimeSetting('SITE_URL') || 'http://127.0.0.1:4173');
  return {
    metadataBase: origin,
    title: {
      default: `${title} — Finance & research`,
      template: `%s — ${title}`,
    },
    description: profile.intro,
    robots: { index: mode === 'production', follow: mode === 'production' },
    icons: {
      icon: { url: monogramIconDataUrl(profile.monogram), type: 'image/svg+xml', sizes: 'any' },
    },
    openGraph: {
      title: `${title} — Finance & research`,
      description: profile.intro,
      type: 'website',
      images: [{ url: '/social.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: ['/social.png'] },
  };
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { profile, mode } = await loadPublicContent();
  const title = profileJourney(profile).title;
  // Browser extensions can add body attributes before React starts (e.g. cz-shortcut-listen).
  // Tolerate attributes on this element only; descendant mismatches remain visible.
  return (
    <html lang="en" className={`${bodyFont.variable} ${editorialFont.variable}`}>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader profile={profile} preview={mode === 'preview'} />
        {children}
        <ContactCredentials profile={profile} />
        <SiteFooter name={title} />
      </body>
    </html>
  );
}
