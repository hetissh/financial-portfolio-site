// Marks the active local-admin section and links back to the public site.
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import styles from './admin.module.css';

const links = [
  {
    href: '/admin/',
    label: 'Overview',
    match: (path: string) => path === '/admin/',
  },
  {
    href: '/admin/home/',
    label: 'Homepage',
    match: (path: string) => path.startsWith('/admin/home/'),
  },
  {
    href: '/admin/#notes-heading',
    label: 'Research',
    match: (path: string) => path.startsWith('/admin/research/'),
  },
  {
    href: '/admin/profile/',
    label: 'Profile',
    match: (path: string) => path.startsWith('/admin/profile'),
  },
  {
    href: '/admin/admins/',
    label: 'Admin management',
    match: (path: string) => path.startsWith('/admin/admins'),
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;

  return (
    <nav className={styles.barNav} aria-label="Admin">
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={link.match(path) ? 'page' : undefined}>
          {link.label}
        </Link>
      ))}
      <Link href="/">
        View site <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
      <form action="/api/admin-auth/logout/" method="post">
        <button type="submit">Sign out</button>
      </form>
    </nav>
  );
}
