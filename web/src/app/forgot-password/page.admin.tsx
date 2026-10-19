// Begins the recovery flow without revealing which email addresses are admins.
import { AuthForm } from '@/components/admin/AuthForm';
export const metadata = { title: 'Forgot password', robots: { index: false, follow: false } };
export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
