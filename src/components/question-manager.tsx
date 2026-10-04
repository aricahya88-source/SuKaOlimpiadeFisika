'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileUp, Plus, Search, Trash2 } from 'lucide-react';
import { Modal, PageHeader, Skeleton } from '@/components/ui';
import { RichEditor } from '@/components/rich-editor';
import { SimulationFields } from '@/components/simulation-fields';
import { QuestionStimulus } from '@/components/question-stimulus';
import { MathHtml } from '@/components/math-html';
import { useSession } from '@/contexts/session-context';
import {
  getExamApi,
  type AdminQuestionInput,
  type ExamRecord,
  type MatchingInteractionData,
  type QuestionRecord,
  type QuestionStatus,
  type QuestionType,
  type ScoringMode,
} from '@/lib/api';

const emptyMatching = (): MatchingInteractionData => ({ left: [], right: [] });
const empty = (examId = ''): AdminQuestionInput => ({
  examId: examId || undefined,
  code: '',
  stimulusOrder: 1,
  questionText: '',
  questionHtml: '',
  explanation: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  optionE: '',
  interactionData: emptyMatching(),
  correctAnswers: 'A',
  maxScore: 1,
  score: 1,
  difficulty: 'Sedang',
  tag: '',
  category: '',
  packageName: '',
  status: 'DRAFT',
  questionType: 'SINGLE_CHOICE',
  scoringMode: 'EXACT_MATCH',
  simulationEnabled: false,
  simulationUrl: '',
  simulationTitle: '',
  simulationDescription: '',
  simulationAspectRatio: '16/9',
});
const strip = (v: string) => String(v || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const csvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const normalizeType = (value: unknown): QuestionType => {
  const v = String(value || 'SINGLE_CHOICE').trim().toUpperCase();
  return ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING'].includes(v) ? (v as QuestionType) : 'SINGLE_CHOICE';
};
const normalizeScoring = (value: unknown): ScoringMode => String(value || 'EXACT_MATCH').trim().toUpperCase() === 'PARTIAL_NO_PENALTY' ? 'PARTIAL_NO_PENALTY' : 'EXACT_MATCH';
const normalizeStatus = (value: unknown): QuestionStatus => {
  const v = String(value || 'DRAFT').trim().toUpperCase();
  return ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(v) ? v as QuestionStatus : 'DRAFT';
};
const excelValue = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
  }
  return '';
};
const parseInteractionData = (value: unknown): MatchingInteractionData => {
  if (!value) return emptyMatching();
  if (typeof value === 'object' && value && Array.isArray((value as MatchingInteractionData).left) && Array.isArray((value as MatchingInteractionData).right)) return value as MatchingInteractionData;
  try {
    const parsed = JSON.parse(String(value));
    if (parsed && Array.isArray(parsed.left) && Array.isArray(parsed.right)) {
      return {
        left: parsed.left.map((item: any, idx: number) => ({ id: String(item?.id || `L${idx + 1}`), text: String(item?.text || '') })),
        right: parsed.right.map((item: any, idx: number) => ({ id: String(item?.id || `R${idx + 1}`), text: String(item?.text || '') })),
      };
    }
  } catch {}
  return emptyMatching();
};
const linesToMatching = (text: string, prefix: 'L' | 'R') =>
  text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).map((item, idx) => ({ id: `${prefix}${idx + 1}`, text: item }));
const matchingToLines = (items?: { text: string }[]) => (items || []).map((item) => item.text).join('\n');
const parsePipeList = (value: unknown) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
const normalizeMatchingKey = (value: string) => value.split('|').map((pair) => pair.trim()).filter(Boolean).join('|');
const formatKeyDisplay = (q: QuestionRecord) => q.correctAnswers || q.correctAnswer || '—';

export function QuestionManager() {
  const { session } = useSession();
  const [items, setItems] = useState<QuestionRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [examFilter, setExamFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<AdminQuestionInput>(empty());
  const [csv, setCsv] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    if (!session) return;
    const [q, e] = await Promise.all([getExamApi().listQuestions(session.token, examFilter || undefined), getExamApi().listExams(session.token)]);
    setItems(q);
    setExams(e);
    setLoading(false);
  };
  useEffect(() => { load(); }, [session, examFilter]);

  const filtered = useMemo(() => items.filter((q) => `${q.code || ''} ${strip(q.questionHtml || q.questionText)} ${q.tag} ${q.difficulty}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [query, examFilter, pageSize]);

  const edit = (q: QuestionRecord) => {
    setForm({
      examId: q.examId,
      questionId: q.questionId,
      code: q.code || '',
      stimulusOrder: q.stimulusOrder || 1,
      questionText: q.questionText,
      questionHtml: q.questionHtml || q.questionText,
      explanation: q.explanation || '',
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      optionE: q.optionE || '',
      interactionData: parseInteractionData(q.interactionData),
      correctAnswers: q.correctAnswers || q.correctAnswer || 'A',
      maxScore: q.maxScore || q.score || 1,
      score: q.score || q.maxScore || 1,
      imageFileId: q.imageFileId,
      topicCode: q.topicCode || '',
      blueprintCode: q.blueprintCode || '',
      questionType: q.questionType || 'SINGLE_CHOICE',
      scoringMode: q.scoringMode || 'EXACT_MATCH',
      difficulty: q.difficulty,
      tag: q.tag,
      category: q.category || '',
      packageName: q.packageName || '',
      status: q.status || 'DRAFT',
      simulationEnabled: Boolean(q.simulationEnabled),
      simulationUrl: q.simulationUrl || '',
      simulationTitle: q.simulationTitle || '',
      simulationDescription: q.simulationDescription || '',
      simulationAspectRatio: q.simulationAspectRatio || '16/9',
    });
    setOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const payload: AdminQuestionInput = {
      ...form,
      questionText: strip(form.questionHtml),
      interactionData: form.questionType === 'MATCHING' ? (form.interactionData || emptyMatching()) : undefined,
    };
    await getExamApi().saveQuestion(session.token, payload);
    setOpen(false);
    setForm(empty(examFilter));
    await load();
  };

  const remove = async (id: string) => {
    if (!session || !confirm('Hapus soal ini?')) return;
    await getExamApi().deleteQuestion(session.token, id);
    load();
  };

  const uploadImage = async (file?: File) => {
    if (!file || !session) return;
    if (file.size > 2_500_000) { setMessage('Gambar maksimal 2,5 MB sebelum optimasi.'); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const uploaded = await getExamApi().uploadQuestionImage(session.token, { name: file.name, mimeType: file.type || 'image/jpeg', base64 });
      setForm((f) => ({ ...f, imageFileId: uploaded.fileId }));
      setMessage(`Gambar Drive tersimpan: ${uploaded.name}`);
    } finally {
      setUploading(false);
    }
  };

  const uploadEditorImage = async (file: File) => {
    if (!session) throw new Error('Sesi berakhir.');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const uploaded = await getExamApi().uploadQuestionImage(session.token, { name: file.name, mimeType: file.type || 'image/jpeg', base64 });
    setMessage(`Gambar WYSIWYG tersimpan di Google Drive: ${uploaded.name}`);
    return uploaded.imageUrl;
  };

  const readExcel = async (file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (!rows.length) { setImportSummary('File Excel tidak memiliki data soal.'); return; }
      const headers = ['examId', 'code', 'stimulusOrder', 'questionType', 'scoringMode', 'difficulty', 'status', 'maxScore', 'tag', 'category', 'packageName', 'questionHtml', 'explanation', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'interactionData', 'correctAnswers', 'topicCode', 'blueprintCode'];
      const out = [headers.join(',')];
      const errors: string[] = [];
      let valid = 0;
      rows.forEach((row, index) => {
        const type = normalizeType(excelValue(row, 'jenis_soal', 'questionType'));
        const scoring = normalizeScoring(excelValue(row, 'sistem_penilaian', 'scoringMode'));
        const stimulus = String(excelValue(row, 'stimulus_html'));
        const prompt = String(excelValue(row, 'pertanyaan_html', 'questionHtml', 'questionText'));
        const questionHtml = [stimulus, prompt].filter(Boolean).join('\n');
        const rawPackageName = String(excelValue(row, 'nama_tryout', 'packageName')).trim();
        const targetExamId = examFilter || '';
        const inferCategory = (name: string) => { const lower = name.toLowerCase(); if (lower.includes('ulangan harian') || /^uh\b/.test(lower)) return 'Ulangan Harian'; if (lower.includes('pts') || lower.includes('tengah semester')) return 'PTS'; if (lower.includes('pas') || lower.includes('akhir semester')) return 'PAS'; if (lower.includes('tryout') || lower.includes('try out')) return 'Tryout'; if (lower.includes('remedial')) return 'Remedial'; return 'Tanpa Kategori'; };
        const category = String(excelValue(row, 'kategori_soal', 'category')).trim() || inferCategory(rawPackageName);
        const packageName = rawPackageName;
        const key = String(excelValue(row, 'kunci_jawaban', 'correctAnswers')).toUpperCase().replace(/\s+/g, '');
        const a = String(excelValue(row, 'opsi_a', 'optionA'));
        const b = String(excelValue(row, 'opsi_b', 'optionB'));
        const c = String(excelValue(row, 'opsi_c', 'optionC'));
        const d = String(excelValue(row, 'opsi_d', 'optionD'));
        const e = String(excelValue(row, 'opsi_e', 'optionE'));
        const statements = [a, b, c, d, e].filter(Boolean);
        const leftItems = parsePipeList(excelValue(row, 'matching_left', 'menjodohkan_kiri'));
        const rightItems = parsePipeList(excelValue(row, 'matching_right', 'menjodohkan_kanan'));
        const interactionData = type === 'MATCHING'
          ? JSON.stringify({
              left: leftItems.map((text, idx) => ({ id: `L${idx + 1}`, text })),
              right: rightItems.map((text, idx) => ({ id: `R${idx + 1}`, text })),
            })
          : '';
        let error = '';
        if (!questionHtml.trim()) error = 'pertanyaan kosong';
        else if (type === 'SINGLE_CHOICE' && !/^[A-E]$/.test(key)) error = 'kunci PG harus A-E';
        else if (type === 'MULTIPLE_CHOICE' && !/^([A-E])(,[A-E])*$/.test(key)) error = 'kunci PG kompleks harus seperti A,C,D';
        else if (type === 'TRUE_FALSE' && (!/^[BS](,[BS])*$/.test(key) || key.split(',').length !== statements.length)) error = 'kunci benar/salah harus B,S,... sesuai jumlah pernyataan';
        else if (type === 'MATCHING') {
          if (leftItems.length < 2 || rightItems.length < 2) error = 'soal menjodohkan minimal 2 item kiri dan 2 item kanan';
          else if (!/^\d+:\d+(\|\d+:\d+)*$/.test(key)) error = 'kunci menjodohkan harus seperti 1:3|2:1|3:2';
          else {
            const pairs = key.split('|').map((pair) => pair.split(':').map(Number));
            const seenLeft = new Set<number>();
            const invalid = pairs.some(([leftIndex, rightIndex]) => !leftIndex || !rightIndex || leftIndex > leftItems.length || rightIndex > rightItems.length || seenLeft.has(leftIndex));
            if (invalid || pairs.length !== leftItems.length) error = 'kunci menjodohkan harus mencakup semua item kiri tanpa duplikat';
            pairs.forEach(([leftIndex]) => seenLeft.add(leftIndex));
          }
        }
        if (error) { errors.push(`Baris ${index + 2}: ${error}`); return; }
        const values = [
          targetExamId,
          excelValue(row, 'kode_soal', 'code') || `IMP-${Date.now()}-${index + 1}`,
          Number(excelValue(row, 'urutan_stimulus', 'urutan_soal', 'stimulusOrder') || index + 1),
          type,
          scoring,
          excelValue(row, 'tingkat_kesulitan', 'difficulty') || 'Sedang',
          normalizeStatus(excelValue(row, 'status')),
          Number(excelValue(row, 'bobot', 'maxScore', 'score') || 1),
          excelValue(row, 'topik', 'tag'),
          category,
          packageName,
          questionHtml,
          excelValue(row, 'pembahasan_html', 'explanation'),
          type === 'MATCHING' ? '' : a,
          type === 'MATCHING' ? '' : b,
          type === 'MATCHING' ? '' : c,
          type === 'MATCHING' ? '' : d,
          type === 'MATCHING' ? '' : e,
          interactionData,
          type === 'MATCHING' ? normalizeMatchingKey(key) : key,
          excelValue(row, 'kode_topik', 'topicCode'),
          excelValue(row, 'kode_kisi_kisi', 'blueprintCode'),
        ];
        out.push(values.map(csvCell).join(','));
        valid++;
      });
      setCsv(out.join('\n'));
      setImportSummary(`${valid} soal valid dari ${rows.length} baris.${errors.length ? ` ${errors.length} baris tidak ikut: ${errors.slice(0, 4).join(' • ')}${errors.length > 4 ? ' …' : ''}` : ''}`);
      setImportOpen(true);
    } catch (error) {
      setImportSummary(error instanceof Error ? error.message : 'Gagal membaca Excel.');
    }
  };

  const doImport = async () => {
    if (!session) return;
    const r = await getExamApi().importQuestionsCsv(session.token, csv);
    setMessage(`${r.imported} soal diimpor.${r.errors.length ? ` ${r.errors.length} baris bermasalah.` : ''}`);
    setImportOpen(false);
    load();
  };

  const setType = (t: QuestionType) => setForm({
    ...form,
    questionType: t,
    correctAnswers: t === 'TRUE_FALSE' ? 'B,B,B,B' : t === 'MULTIPLE_CHOICE' ? 'A,C' : t === 'MATCHING' ? '1:1|2:2' : 'A',
    scoringMode: t === 'SINGLE_CHOICE' ? 'EXACT_MATCH' : form.scoringMode,
    interactionData: t === 'MATCHING' ? (form.interactionData || { left: [{ id: 'L1', text: '' }, { id: 'L2', text: '' }], right: [{ id: 'R1', text: '' }, { id: 'R2', text: '' }] }) : form.interactionData,
  });

  const setMatchingSide = (side: 'left' | 'right', value: string) => {
    const next = form.interactionData || emptyMatching();
    const mapped = linesToMatching(value, side === 'left' ? 'L' : 'R');
    setForm({ ...form, interactionData: { ...next, [side]: mapped } });
  };

  const matchingLeftText = matchingToLines(form.interactionData?.left);
  const matchingRightText = matchingToLines(form.interactionData?.right);
  const isMatching = form.questionType === 'MATCHING';

  return <>
    <PageHeader eyebrow="BANK SOAL" title="Bank soal lengkap" description="Bank soal reusable seperti SuKa Olimpiade Fisika: WYSIWYG, LaTeX/KaTeX, source HTML, gambar, tabel, 4 jenis soal termasuk menjodohkan, pembahasan, bobot, status, pemetaan ujian, pagination, dan impor Excel." action={<div className="action-row"><button className="button secondary" onClick={() => setImportOpen(true)}><FileUp size={18}/>Impor Excel / CSV</button><button className="button primary" onClick={() => { setForm(empty(examFilter)); setOpen(true); }}><Plus size={18}/>Tambah soal</button></div>} />
    {message && <div className="notice neutral">{message}</div>}
    <div className="manager-tools"><div className="left"><select value={examFilter} onChange={e => setExamFilter(e.target.value)}><option value="">Seluruh bank soal</option>{exams.map(e => <option key={e.examId} value={e.examId}>{e.title}</option>)}</select><div className="search-box"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari kode, soal, tag..." /></div></div><div className="right"><span>{filtered.length} soal</span><select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10 / halaman</option><option value={20}>20 / halaman</option><option value={30}>30 / halaman</option><option value={60}>60 / halaman</option></select></div></div>
    {loading ? <Skeleton height={340} /> : <section className="panel"><div className="table-wrap"><table><thead><tr><th>Kode</th><th>Soal</th><th>Jenis</th><th>Kesulitan</th><th>Status</th><th>Kunci</th><th></th></tr></thead><tbody>{paged.map(q => <tr key={q.questionId}><td><strong>{q.code || '-'}</strong><small>No. {q.stimulusOrder || 1}</small></td><td className="question-html-cell"><MathHtml html={q.questionHtml || q.questionText} className="reading-content" /><small>{q.authorName || 'Bank soal'} • {q.tag || q.topicCode || 'Tanpa tag'}</small></td><td><span className="type-pill">{q.questionType}</span></td><td>{q.difficulty}</td><td><span className={`badge status-${String(q.status).toLowerCase()}`}>{q.status}</span></td><td><span className="key-pill">{formatKeyDisplay(q)}</span></td><td><div className="row-actions"><button onClick={() => edit(q)}>Edit</button><button className="danger" onClick={() => remove(q.questionId)}><Trash2 /></button></div></td></tr>)}</tbody></table></div>{filtered.length > pageSize && <div className="manager-pagination"><span>Halaman {page} dari {pages}</span><div className="manager-pagination-actions"><button className="button secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button><button className="button secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button></div></div>}</section>}
    <Modal open={open} onClose={() => setOpen(false)} title={form.questionId ? 'Edit soal' : 'Tambah soal'} size="large"><form className="form-grid" onSubmit={save}>
      <label>Tambahkan langsung ke ujian (opsional)<select value={form.examId || ''} onChange={e => setForm({ ...form, examId: e.target.value || undefined })}><option value="">Simpan ke bank soal saja</option>{exams.map(e => <option key={e.examId} value={e.examId}>{e.title}</option>)}</select></label><label>Kode soal<input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="FIS-001" /></label>
      <label>Jenis soal<select value={form.questionType} onChange={e => setType(e.target.value as QuestionType)}><option value="SINGLE_CHOICE">Pilihan ganda biasa</option><option value="MULTIPLE_CHOICE">Pilihan ganda kompleks</option><option value="TRUE_FALSE">Benar atau salah</option><option value="MATCHING">Menjodohkan</option></select></label><label>Sistem penilaian<select value={form.scoringMode} onChange={e => setForm({ ...form, scoringMode: e.target.value as ScoringMode })}><option value="EXACT_MATCH">Exact match</option><option value="PARTIAL_NO_PENALTY">Parsial tanpa penalti</option></select></label>
      <label>Kategori soal<input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ulangan Harian / PTS / PAS / Tryout" /></label><label>Nama paket soal<input value={form.packageName || ''} onChange={e => setForm({ ...form, packageName: e.target.value })} placeholder="Soal Ulangan Harian 2" /></label>
      <label>Kesulitan<select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}><option>Mudah</option><option>Sedang</option><option>Sulit</option></select></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as QuestionStatus })}><option>DRAFT</option><option>REVIEW</option><option>PUBLISHED</option><option>ARCHIVED</option></select></label>
      <label>Urutan / stimulus<input type="number" min="1" value={form.stimulusOrder || 1} onChange={e => setForm({ ...form, stimulusOrder: Number(e.target.value) })} /></label><label>Bobot soal<input type="number" min="0.1" step="0.1" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: Number(e.target.value), score: Number(e.target.value) })} /></label><label>Tag / topik<input value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} /></label><label>Kode topik<input value={form.topicCode || ''} onChange={e => setForm({ ...form, topicCode: e.target.value })} placeholder="FISIKA-GERAK" /></label><label className="span-2">Kode kisi-kisi / blueprint (opsional)<input value={form.blueprintCode || ''} onChange={e => setForm({ ...form, blueprintCode: e.target.value })} placeholder="IPA-SMP-GERAK-001" /></label>
      <div className="span-2"><SimulationFields value={form} onChange={next=>setForm({...form,...next})}/></div>
      <div className="span-2"><RichEditor uploadImage={uploadEditorImage} onInsertSimulation={()=>setForm(f=>({...f,simulationEnabled:true}))} label="Soal / stimulus" value={form.questionHtml} onChange={v => setForm(f => ({ ...f, questionHtml: v }))} placeholder="Tulis soal. Mendukung format teks, gambar, tabel, tautan, dan rumus LaTeX." /></div>

      <div className="span-2 question-card"><QuestionStimulus html={form.questionHtml} simulation={form}/></div>
      {!isMatching ? <>
        <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label={form.questionType === 'TRUE_FALSE' ? 'Pernyataan 1 / Opsi A' : 'Opsi A'} value={form.optionA} onChange={v => setForm({ ...form, optionA: v })} /></div>
        <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label={form.questionType === 'TRUE_FALSE' ? 'Pernyataan 2 / Opsi B' : 'Opsi B'} value={form.optionB} onChange={v => setForm({ ...form, optionB: v })} /></div>
        <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label={form.questionType === 'TRUE_FALSE' ? 'Pernyataan 3 / Opsi C' : 'Opsi C'} value={form.optionC} onChange={v => setForm({ ...form, optionC: v })} /></div>
        <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label={form.questionType === 'TRUE_FALSE' ? 'Pernyataan 4 / Opsi D' : 'Opsi D'} value={form.optionD} onChange={v => setForm({ ...form, optionD: v })} /></div>
        <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label="Opsi E / Pernyataan 5 (opsional)" value={form.optionE || ''} onChange={v => setForm({ ...form, optionE: v })} /></div>
      </> : <>
        <label className="span-2">Daftar pasangan kiri<textarea rows={6} value={matchingLeftText} onChange={e => setMatchingSide('left', e.target.value)} placeholder={`Hukum I Newton\nHukum II Newton\nHukum III Newton`} /></label>
        <label className="span-2">Daftar pasangan kanan<textarea rows={6} value={matchingRightText} onChange={e => setMatchingSide('right', e.target.value)} placeholder={`F = ma\nAksi = reaksi\nBenda mempertahankan keadaan gerak`} /></label>
        <div className="span-2 notice neutral">Tulis satu item per baris. Kunci jawaban memakai format <strong>1:3|2:1|3:2</strong>, artinya item kiri 1 dipasangkan dengan item kanan 3, item kiri 2 dengan kanan 1, dan seterusnya.</div>
      </>}

      <label className="span-2">Kunci jawaban<input value={form.correctAnswers} onChange={e => setForm({ ...form, correctAnswers: form.questionType === 'MATCHING' ? normalizeMatchingKey(e.target.value) : e.target.value.toUpperCase() })} placeholder={form.questionType === 'SINGLE_CHOICE' ? 'A' : form.questionType === 'MULTIPLE_CHOICE' ? 'A,C,D' : form.questionType === 'MATCHING' ? '1:3|2:1|3:2' : 'B,S,B,S'} /><span className="answer-help">PG biasa: A. PG kompleks: A,C,D. Benar/Salah: B,S,B,S sesuai jumlah pernyataan. Menjodohkan: 1:3|2:1|3:2.</span></label>
      <div className="span-2"><RichEditor uploadImage={uploadEditorImage} label="Pembahasan" value={form.explanation || ''} onChange={v => setForm({ ...form, explanation: v })} placeholder="Tulis pembahasan jawaban. Mendukung LaTeX." /></div>
      <label className="span-2">Gambar utama (Google Drive)<input type="file" accept="image/*" disabled={uploading} onChange={e => uploadImage(e.target.files?.[0])} />{form.imageFileId && <small>File ID: {form.imageFileId}</small>}</label>
      <div className="form-actions span-2"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Batal</button><button className="button primary">Simpan soal</button></div>
    </form></Modal>
    <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Impor bank soal Excel / CSV" size="large"><div className="import-source-grid"><div className="import-source-card"><FileSpreadsheet size={28} /><div><strong>Excel SuKa Olimpiade Fisika</strong><p className="muted">Unggah template .xlsx/.xls SuKa Olimpiade Fisika. Kolom <code>nama_tryout</code> dibaca sebagai nama paket soal dan <code>kategori_soal</code> sebagai kategorinya. Soal menjodohkan dapat memakai kolom <code>matching_left</code>, <code>matching_right</code>, dan kunci <code>1:3|2:1</code>.</p></div><input type="file" accept=".xlsx,.xls" onChange={e => readExcel(e.target.files?.[0])} /><a className="button secondary" href="/templates/question-import-template.xlsx" download><Download size={16} />Template Excel asli</a></div><div className="import-source-card"><FileUp size={28} /><div><strong>CSV lanjutan</strong><p className="muted">Bisa ditempel langsung untuk integrasi eksternal. Header canonical juga mendukung field <code>interactionData</code>.</p></div></div></div>{importSummary && <div className="notice neutral">{importSummary}</div>}<textarea className="csv-area" rows={12} value={csv} onChange={e => setCsv(e.target.value)} placeholder="CSV hasil konversi Excel atau tempel CSV di sini..." /><div className="form-actions"><button className="button secondary" onClick={() => setImportOpen(false)}>Batal</button><button className="button primary" disabled={!csv.trim()} onClick={doImport}>Validasi & impor</button></div></Modal>
  </>;
}
