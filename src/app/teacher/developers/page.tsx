import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { DeveloperPage } from '@/components/developer-page';

export default function TeacherDevelopersPage() {
  return <AuthGuard role="teacher"><AdminShell><DeveloperPage /></AdminShell></AuthGuard>;
}
