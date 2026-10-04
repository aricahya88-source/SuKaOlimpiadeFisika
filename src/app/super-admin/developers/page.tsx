import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { DeveloperPage } from '@/components/developer-page';

export default function SuperAdminDevelopersPage() {
  return <AuthGuard role="super_admin"><AdminShell><DeveloperPage /></AdminShell></AuthGuard>;
}
