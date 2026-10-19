// Login lives outside the protected admin layout so an unsigned visitor can reach it.
import { AuthForm } from '@/components/admin/AuthForm';
export const metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };
export default function LoginPage() {
  return <AuthForm mode="login" />;
}
