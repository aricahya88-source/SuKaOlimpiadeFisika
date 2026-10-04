'use client';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { MonitoringManager } from '@/components/monitoring-manager';
export default function MonitoringPage(){return <AuthGuard role="teacher"><AdminShell><MonitoringManager/></AdminShell></AuthGuard>;}
