'use client';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { MonitoringManager } from '@/components/monitoring-manager';
export default function MonitoringPage(){return <AuthGuard role="super_admin"><AdminShell><MonitoringManager/></AdminShell></AuthGuard>;}
