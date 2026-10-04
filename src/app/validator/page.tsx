'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, ListChecks, Clock3 } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { PageHeader, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type ValidationAssignment } from '@/lib/api';

export default function ValidatorDashboard(){
 const {session}=useSession(); const [items,setItems]=useState<ValidationAssignment[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!session)return;getExamApi().listAssignments(session.token).then(setItems).finally(()=>setLoading(false))},[session]);
 const pending=items.filter(x=>x.status==='PENDING').length; const approved=items.filter(x=>x.status==='APPROVED').length; const revision=items.filter(x=>x.status==='REVISION_REQUIRED').length; const rejected=items.filter(x=>x.status==='REJECTED').length;
 return <AuthGuard role="validator"><AdminShell><PageHeader eyebrow="DASHBOARD VALIDATOR" title="Ringkasan Validasi" description="Pantau jumlah soal yang ditugaskan dan status validasi Anda."/>{loading?<Skeleton height={220}/>:<section className="admin-stat-grid validator-stat-grid"><article><div className="stat-icon blue"><ClipboardCheck size={20}/></div><span>Soal Ditugaskan</span><strong>{items.length}</strong><small>Seluruh penugasan</small></article><article><div className="stat-icon orange"><Clock3 size={20}/></div><span>Menunggu Validasi</span><strong>{pending}</strong><small>Perlu diperiksa</small></article><article><div className="stat-icon green"><CheckCircle2 size={20}/></div><span>Valid</span><strong>{approved}</strong><small>Disetujui</small></article><article><div className="stat-icon purple"><ListChecks size={20}/></div><span>Perlu Tindakan</span><strong>{revision+rejected}</strong><small>{revision} revisi · {rejected} tidak layak</small></article></section>}</AdminShell></AuthGuard>
}
