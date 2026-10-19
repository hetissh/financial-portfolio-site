// Accepts a one-time reset link; the browser clears the query after the first render.
import { AuthForm } from '@/components/admin/AuthForm';
export const metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AuthForm mode="reset" token={token} />;
}
