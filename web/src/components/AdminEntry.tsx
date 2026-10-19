// Links the combined site's visitor shell to its protected admin route.
import Link from 'next/link';
export function AdminEntry({ className }: { className?: string }) {
  return (
    <Link className={className} href="/admin/" prefetch={false}>
      Admin
    </Link>
  );
}
