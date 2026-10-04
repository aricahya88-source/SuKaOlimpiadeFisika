'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { AdminShell } from '@/components/admin-shell';
import { Modal, PageHeader, Skeleton } from '@/components/ui';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type TeacherInput, type TeacherRecord } from '@/lib/api';

const empty:TeacherInput={name:'',username:'',subject:'',password:'',status:'ACTIVE'};
export default function TeachersPage(){
  const{session}=useSession();const[items,setItems]=useState<TeacherRecord[]>([]);const[loading,setLoading]=useState(true);const[open,setOpen]=useState(false);const[form,setForm]=useState<TeacherInput>(empty);
  const load=()=>session&&getExamApi().listTeachers(session.token).then(setItems).finally(()=>setLoading(false));
  useEffect(()=>{load()},[session]);
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!session)return;await getExamApi().saveTeacher(session.token,form);setOpen(false);setForm(empty);load()};
  const remove=async(id:string)=>{if(!session||!confirm('Hapus akun panitia ini?'))return;try{await getExamApi().deleteTeacher(session.token,id);load()}catch(e){alert(e instanceof Error?e.message:'Gagal menghapus panitia.')}};
  return <AuthGuard role="super_admin"><AdminShell><PageHeader eyebrow="GURU" title="Akun panitia" description="Super Admin mengelola akun panitia. Setiap ujian memiliki owner panitia agar data antar-panitia terpisah." action={<button className="button primary" onClick={()=>{setForm(empty);setOpen(true)}}><UserPlus size={18}/>Tambah panitia</button>}/>
  {loading?<Skeleton height={280}/>:<section className="panel"><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Mata Pelajaran</th><th>Status</th><th></th></tr></thead><tbody>{items.map(g=><tr key={g.userId}><td><strong>{g.name}</strong><small>{g.userId}</small></td><td>{g.username}</td><td>{g.subject||'—'}</td><td><span className={`status-dot ${g.status==='ACTIVE'?'active':'closed'}`}>{g.status}</span></td><td><div className="row-actions"><button onClick={()=>{setForm({userId:g.userId,name:g.name,username:g.username,subject:g.subject||'',status:g.status});setOpen(true)}}>Edit</button><button className="danger" onClick={()=>remove(g.userId)}><Trash2/></button></div></td></tr>)}</tbody></table></div></section>}
  <Modal open={open} onClose={()=>setOpen(false)} title={form.userId?'Edit panitia':'Tambah panitia'}><form className="form-grid" onSubmit={save}><label className="span-2">Nama lengkap<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Username<input required value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></label><label>Mata pelajaran<input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><label className="span-2">Password {form.userId&&'(kosongkan jika tidak diubah)'}<input type="password" required={!form.userId} value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'ACTIVE'|'INACTIVE'})}><option>ACTIVE</option><option>INACTIVE</option></select></label><div className="form-actions span-2"><button type="button" className="button secondary" onClick={()=>setOpen(false)}>Batal</button><button className="button primary"><Plus size={17}/>Simpan</button></div></form></Modal>
  </AdminShell></AuthGuard>;
}
