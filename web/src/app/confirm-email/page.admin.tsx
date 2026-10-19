// Opens a one-time email confirmation link without requiring the old browser session.
import { EmailConfirmation } from '@/components/admin/EmailConfirmation';
export const metadata = {
  title: 'Confirm admin email',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <EmailConfirmation token={token} />;
}
