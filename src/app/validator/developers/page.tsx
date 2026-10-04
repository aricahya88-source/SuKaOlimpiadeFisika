'use client';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { DeveloperPage } from '@/components/developer-page';
export default function Page(){return <AuthGuard role="validator"><AdminShell><DeveloperPage/></AdminShell></AuthGuard>}
