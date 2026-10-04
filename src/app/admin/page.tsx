'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/session-context';
import { homeForRole } from '@/lib/role-route';
export default function LegacyAdminRedirect(){const {session,loading}=useSession();const router=useRouter();useEffect(()=>{if(!loading&&session)router.replace(homeForRole(session.user.role));else if(!loading&&!session)router.replace('/');},[loading,session,router]);return <div className="center-screen">Mengalihkan...</div>}
