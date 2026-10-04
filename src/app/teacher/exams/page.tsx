'use client';
import { AuthGuard } from '@/components/auth-guard'; import { AdminShell } from '@/components/admin-shell'; import { ExamManager } from '@/components/exam-manager';
export default function Page(){return <AuthGuard role="teacher"><AdminShell><ExamManager/></AdminShell></AuthGuard>}
