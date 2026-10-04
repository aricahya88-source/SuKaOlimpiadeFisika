'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpenCheck, Copy, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { Badge, Modal, PageHeader, Skeleton } from '@/components/ui';
import { RichEditor } from '@/components/rich-editor';
import { MathHtml } from '@/components/math-html';
import { useSession } from '@/contexts/session-context';
import { getExamApi, type AdminExamInput, type ExamRecord, type QuestionPackageSummary, type QuestionRecord, type StudentRecord, type TeacherRecord } from '@/lib/api';
import { formatDateTime, toWibDateTimeLocal, wibDateTimeLocalToIso } from '@/lib/format';

const emptyForm = (): AdminExamInput => ({
  title: '', subject: '', className: '',
  startTime: toWibDateTimeLocal(new Date(Date.now() + 3600_000)),
  endTime: toWibDateTimeLocal(new Date(Date.now() + 25 * 3600_000)),
  durationMinutes: 45, questionCount: 0, status: 'SCHEDULED', randomizeQuestion: true, randomizeOption: true,
  resultVisibility: 'immediate', token: '', attemptPolicy: 'single', descriptionHtml: '', instructions: '',
  rulesHtml: '<p>Kerjakan secara mandiri. Pastikan seluruh jawaban tersimpan sebelum mengumpulkan.</p>',
});

const plain = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function ExamManager({ superAdmin = false }: { superAdmin?: boolean }) {
  const { session } = useSession();
  const [items, setItems] = useState<ExamRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdminExamInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState('');
  const [packages, setPackages] = useState<QuestionPackageSummary[]>([]);
  const [sourceMode, setSourceMode] = useState<'package' | 'manual'>('package');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');

  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingExam, setMappingExam] = useState<ExamRecord | null>(null);
  const [bank, setBank] = useState<QuestionRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [mappingQuery, setMappingQuery] = useState('');
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingSaving, setMappingSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    const [exams, teacherRows, packageRows, studentRows] = await Promise.all([
      getExamApi().listExams(session.token),
      superAdmin ? getExamApi().listTeachers(session.token) : Promise.resolve([]),
      getExamApi().listQuestionPackages(session.token),
      getExamApi().listStudents(session.token),
    ]);
    setItems(exams); setTeachers(teacherRows); setPackages(packageRows); setStudents(studentRows); setLoading(false);
  };
  useEffect(() => { load(); }, [session]);

  const filtered = useMemo(() => items.filter((e) => `${e.title} ${e.subject} ${e.className} ${e.ownerName || ''}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const availableBank = useMemo(() => bank.filter((q) => `${q.code || ''} ${plain(q.questionHtml || q.questionText)} ${q.tag || ''} ${q.difficulty || ''}`.toLowerCase().includes(mappingQuery.toLowerCase())), [bank, mappingQuery]);
  const selectedQuestions = useMemo(() => selected.map((id) => bank.find((q) => q.questionId === id)).filter(Boolean) as QuestionRecord[], [selected, bank]);
  const packageCategories = useMemo(() => [...new Set(packages.map((p) => p.category || 'Tanpa Kategori'))], [packages]);
  const filteredPackages = useMemo(() => packages.filter((p) => !selectedCategory || p.category === selectedCategory), [packages, selectedCategory]);
  const classOptions = useMemo(() => [...new Set(students.filter((student) => student.status === 'ACTIVE').map((student) => String(student.className || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id-ID')), [students]);
  const selectedPackageInfo = useMemo(() => packages.find((p) => p.category === selectedCategory && p.packageName === selectedPackage) || packages.find((p) => p.packageName === selectedPackage), [packages, selectedCategory, selectedPackage]);

  const edit = (exam: ExamRecord) => {
    setFormError('');
    setForm({ ...exam, startTime: toWibDateTimeLocal(exam.startTime), endTime: toWibDateTimeLocal(exam.endTime), token: exam.token || '', descriptionHtml: exam.descriptionHtml || '', rulesHtml: exam.rulesHtml || '', instructions: exam.instructions || '' });
    setSourceMode('manual'); setSelectedCategory(''); setSelectedPackage('');
    setOpen(true);
  };
  const createNew = () => { setFormError(''); setForm({ ...emptyForm(), className: classOptions[0] || '' }); setSourceMode(packages.length ? 'package' : 'manual'); setSelectedCategory(packageCategories[0] || ''); setSelectedPackage(''); setOpen(true); };
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!session) return; setSaving(true); setFormError('');
    try {
      const saved = await getExamApi().saveExam(session.token, { ...form, startTime: wibDateTimeLocalToIso(form.startTime), endTime: wibDateTimeLocalToIso(form.endTime) });
      if (sourceMode === 'package' && selectedPackage) {
        await getExamApi().applyQuestionPackage(session.token, saved.examId, selectedCategory, selectedPackage);
      }
      setOpen(false); setForm(emptyForm()); setSelectedCategory(''); setSelectedPackage(''); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Gagal menyimpan ujian.'); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!session || !confirm('Hapus ujian ini? Bank soal tidak ikut dihapus.')) return; await getExamApi().deleteExam(session.token, id); load(); };
  const duplicate = async (id: string) => { if (!session) return; await getExamApi().duplicateExam(session.token, id); load(); };
  const uploadEditorImage = async (file: File) => {
    if (!session) throw new Error('Sesi berakhir.');
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
    const uploaded = await getExamApi().uploadQuestionImage(session.token, { name: file.name, mimeType: file.type || 'image/jpeg', base64 });
    return uploaded.imageUrl;
  };

  const openMapping = async (exam: ExamRecord) => {
    if (!session) return; setMappingExam(exam); setMappingOpen(true); setMappingLoading(true); setMappingQuery('');
    try {
      const [questions, ids] = await Promise.all([getExamApi().listQuestions(session.token), getExamApi().getExamQuestionIds(session.token, exam.examId)]);
      setBank(questions); setSelected(ids);
    } finally { setMappingLoading(false); }
  };
  const toggleMapped = (id: string) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const moveMapped = (id: string, direction: -1 | 1) => setSelected((current) => {
    const index = current.indexOf(id); const target = index + direction; if (index < 0 || target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const saveMapping = async () => {
    if (!session || !mappingExam) return; setMappingSaving(true);
    try { await getExamApi().saveExamQuestions(session.token, mappingExam.examId, selected); setMappingOpen(false); await load(); }
    finally { setMappingSaving(false); }
  };

  return <>
    <PageHeader eyebrow="UJIAN" title="Pengaturan ujian" description="Pengaturan ujian lengkap seperti SuKa Olimpiade Fisika: jadwal, WYSIWYG/LaTeX, aturan, token, randomisasi, visibilitas hasil, serta pemetaan Bank Soal reusable." action={<button className="button primary" onClick={createNew}><Plus size={18}/>Buat ujian</button>}/>
    <div className="toolbar"><input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari ujian, mapel, kelas, atau panitia..."/></div>
    {loading ? <Skeleton height={280}/> : <section className="panel"><div className="table-wrap"><table><thead><tr><th>Ujian</th>{superAdmin && <th>Pemilik</th>}<th>Kelas</th><th>Soal</th><th>Durasi</th><th>Status</th><th>Jadwal</th><th></th></tr></thead><tbody>{filtered.map((exam) => <tr key={exam.examId}><td><strong>{exam.title}</strong><small>{exam.subject}</small></td>{superAdmin && <td>{exam.ownerName || '-'}</td>}<td>{exam.className}</td><td><strong>{exam.questionCount}</strong></td><td>{exam.durationMinutes} menit</td><td><Badge tone={['ACTIVE','OPEN'].includes(exam.status) ? 'success' : exam.status === 'DRAFT' ? 'neutral' : 'primary'}>{exam.status}</Badge></td><td><small>{formatDateTime(exam.startTime)}<br/>s.d. {formatDateTime(exam.endTime)}</small></td><td><div className="row-actions"><button onClick={() => openMapping(exam)} title="Pemetaan soal"><BookOpenCheck/></button><button onClick={() => edit(exam)} title="Edit"><Edit3/></button><button onClick={() => duplicate(exam.examId)} title="Duplikat"><Copy/></button><button className="danger" onClick={() => remove(exam.examId)} title="Hapus"><Trash2/></button></div></td></tr>)}</tbody></table></div></section>}

    <Modal open={open} onClose={() => setOpen(false)} title={form.examId ? 'Edit pengaturan ujian' : 'Buat ujian'} size="large"><form className="form-grid" onSubmit={save}>
      {formError && <div className="span-2 notice danger">{formError}</div>}
      {superAdmin && <label className="span-2">Panitia pemilik<select value={form.ownerId || ''} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} required><option value="">Pilih panitia</option>{teachers.map((t) => <option key={t.userId} value={t.userId}>{t.name} • {t.subject}</option>)}</select></label>}
      <label className="span-2">Judul ujian<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label>
      <label>Mata pelajaran<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}/></label><label>Kelas peserta<select required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}><option value="">Pilih kelas</option>{classOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select><span className="answer-help">Kelas diambil dari data Peserta. Hanya peserta di kelas ini yang dapat melihat dan memulai ujian.</span></label>
      <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label="Deskripsi ujian" value={form.descriptionHtml || ''} onChange={(value) => setForm({ ...form, descriptionHtml: value })} placeholder="Tuliskan deskripsi ujian. Mendukung tabel, gambar, tautan, source HTML, dan LaTeX."/></div>
      <div className="span-2 panel"><strong>Sumber soal</strong><div className="action-row"><label className="check-label"><input type="radio" name="question-source" checked={sourceMode === 'package'} onChange={() => setSourceMode('package')}/>Pilih paket soal</label><label className="check-label"><input type="radio" name="question-source" checked={sourceMode === 'manual'} onChange={() => setSourceMode('manual')}/>Pilih manual dari Bank Soal</label></div>{sourceMode === 'package' ? <div className="form-grid"><label>Kategori soal<select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedPackage(''); }}><option value="">Semua kategori</option>{packageCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Paket soal<select value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value)} required><option value="">Pilih paket soal</option>{filteredPackages.map((pkg) => <option key={`${pkg.category}-${pkg.packageName}`} value={pkg.packageName}>{pkg.packageName} • {pkg.publishedCount ?? pkg.questionCount}/{pkg.questionCount} siap</option>)}</select></label>{selectedPackageInfo && <div className="span-2 notice neutral"><strong>{selectedPackageInfo.packageName}</strong><br/>{selectedPackageInfo.publishedCount ?? selectedPackageInfo.questionCount} soal berstatus PUBLISHED/ACTIVE dari {selectedPackageInfo.questionCount} soal dalam paket. Saat jadwal disimpan, soal siap pakai langsung dipetakan ke ujian.</div>}</div> : <div className="notice neutral">Jadwal disimpan terlebih dahulu. Setelah itu gunakan tombol <strong>Pemetaan Soal</strong> pada daftar ujian untuk memilih soal satu per satu.</div>}</div>
      <label>Mulai <span className="field-timezone">WIB</span><input type="datetime-local" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}/></label><label>Selesai <span className="field-timezone">WIB</span><input type="datetime-local" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}/></label>
      <label>Durasi (menit)<input type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}/></label><label>Jumlah soal terpetakan<input type="number" value={form.questionCount} readOnly/><span className="answer-help">Jumlah ini mengikuti Pemetaan Soal, bukan diketik manual.</span></label>
      <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AdminExamInput['status'] })}><option>DRAFT</option><option>SCHEDULED</option><option>OPEN</option><option>PAUSED</option><option>ENDED</option><option>ARCHIVED</option></select><small>DRAFT tidak terlihat peserta. SCHEDULED terlihat sesuai kelas dan otomatis dapat dimulai saat waktu mulai.</small></label>
      <label>Visibilitas hasil<select value={form.resultVisibility} onChange={(e) => setForm({ ...form, resultVisibility: e.target.value as AdminExamInput['resultVisibility'] })}><option value="immediate">Langsung</option><option value="after_exam_closed">Setelah ujian ditutup</option><option value="manual_publish">Manual publish</option><option value="hidden">Disembunyikan</option></select></label>
      <label>Token ujian (opsional)<input value={form.token || ''} onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })}/></label><label>Kebijakan percobaan<select value={form.attemptPolicy} onChange={(e) => setForm({ ...form, attemptPolicy: e.target.value as AdminExamInput['attemptPolicy'] })}><option value="single">Satu kali</option><option value="allow_reset_by_admin">Dapat di-reset admin</option></select></label>
      <label className="check-label"><input type="checkbox" checked={form.randomizeQuestion} onChange={(e) => setForm({ ...form, randomizeQuestion: e.target.checked })}/>Acak urutan soal</label><label className="check-label"><input type="checkbox" checked={form.randomizeOption} onChange={(e) => setForm({ ...form, randomizeOption: e.target.checked })}/>Acak pilihan jawaban</label>
      <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label="Aturan ujian" value={form.rulesHtml || ''} onChange={(value) => setForm({ ...form, rulesHtml: value })} placeholder="Tuliskan aturan ujian. Mendukung LaTeX dan format kaya."/></div>
      <label className="span-2">Catatan internal / petunjuk singkat<textarea rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}/></label>
      {(form.descriptionHtml || form.rulesHtml) && <div className="span-2 exam-rules-preview"><strong>Preview untuk peserta</strong>{form.descriptionHtml && <MathHtml html={form.descriptionHtml} className="reading-content"/>}{form.rulesHtml && <MathHtml html={form.rulesHtml} className="reading-content"/>}</div>}
      <div className="form-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan ujian'}</button></div>
    </form></Modal>

    <Modal open={mappingOpen} onClose={() => setMappingOpen(false)} title={`Pemetaan soal${mappingExam ? ` — ${mappingExam.title}` : ''}`} size="large">
      {mappingLoading ? <Skeleton height={300}/> : <div className="mapping-layout">
        <section className="mapping-bank"><div className="mapping-heading"><div><strong>Bank Soal</strong><small>{bank.length} soal tersedia</small></div><div className="search-box"><Search size={17}/><input value={mappingQuery} onChange={(e) => setMappingQuery(e.target.value)} placeholder="Cari kode, soal, tag..."/></div></div><div className="mapping-question-list">{availableBank.map((q) => { const checked = selected.includes(q.questionId); return <label key={q.questionId} className={checked ? 'mapping-question checked' : 'mapping-question'}><input type="checkbox" checked={checked} onChange={() => toggleMapped(q.questionId)}/><div><strong>{q.code || q.questionId}</strong><MathHtml html={q.questionHtml || q.questionText} className="mapping-question-text"/><small>{q.questionType} • {q.difficulty} • {q.status}</small></div></label>; })}</div></section>
        <section className="mapping-selected"><div className="mapping-heading"><div><strong>Urutan Ujian</strong><small>{selected.length} soal dipilih</small></div></div>{selectedQuestions.length ? <div className="mapping-selected-list">{selectedQuestions.map((q, index) => <div className="mapped-row" key={q.questionId}><span className="mapped-number">{index + 1}</span><div><strong>{q.code || q.questionId}</strong><small>{plain(q.questionHtml || q.questionText).slice(0, 86)}</small></div><div className="mapped-actions"><button disabled={index === 0} onClick={() => moveMapped(q.questionId, -1)} title="Naik"><ArrowUp/></button><button disabled={index === selectedQuestions.length - 1} onClick={() => moveMapped(q.questionId, 1)} title="Turun"><ArrowDown/></button><button className="danger" onClick={() => toggleMapped(q.questionId)} title="Hapus dari ujian"><Trash2/></button></div></div>)}</div> : <div className="empty-state"><div className="empty-icon"><BookOpenCheck/></div><h3>Belum ada soal</h3><p>Pilih soal dari Bank Soal di sebelah kiri.</p></div>}</section>
      </div>}
      <div className="form-actions mapping-footer"><button className="button secondary" onClick={() => setMappingOpen(false)}>Batal</button><button className="button primary" disabled={mappingLoading || mappingSaving} onClick={saveMapping}>{mappingSaving ? 'Menyimpan...' : `Simpan ${selected.length} soal`}</button></div>
    </Modal>
  </>;
}
