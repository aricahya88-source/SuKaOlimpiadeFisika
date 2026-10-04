import { AuthGuard } from '@/components/auth-guard';
import { StudentShell } from '@/components/student-shell';
import { DeveloperPage } from '@/components/developer-page';

export default function StudentDevelopersPage() {
  return <AuthGuard role="student"><StudentShell><DeveloperPage /></StudentShell></AuthGuard>;
}
