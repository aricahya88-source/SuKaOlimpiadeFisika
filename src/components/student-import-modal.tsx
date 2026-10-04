'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/ui';
import { getExamApi, type ImportStudentRow, type ImportStudentsResult } from '@/lib/api';

const aliases: Record<keyof ImportStudentRow, string[]> = {
  name: ['nama_lengkap','nama','name','nama peserta','nama_peserta'],
  username: ['username','user','nisn','nis','nomor_induk','nomor induk'],
  className: ['kelas','class','class_name','classname','rombel'],
  password: ['password','kata_sandi','kata sandi','password_awal','password awal'],
  email: ['email','e-mail'],
  phone: ['no_hp','no hp','nomor_hp','nomor hp','phone','telepon','whatsapp','wa'],
  status: ['status','aktif'],
};

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function readField(row: Record<string, unknown>, keys: string[]) {
  const entries = Object.entries(row);
  for (const alias of keys) {
    const target = normalizeHeader(alias);
    const found = entries.find(([key]) => normalizeHeader(key) === target);
    if (found && found[1] !== undefined && found[1] !== null) return String(found[1]).trim();
  }
  return '';
}

function mapRow(row: Record<string, unknown>): ImportStudentRow {
  const rawStatus = readField(row, aliases.status).toUpperCase();
  const status = ['INACTIVE','NONAKTIF','NON-AKTIF','TIDAK AKTIF','0','FALSE'].includes(rawStatus) ? 'INACTIVE' : 'ACTIVE';
  return {
    name: readField(row, aliases.name),
    username: readField(row, aliases.username),
    className: readField(row, aliases.className),
    password: readField(row, aliases.password) || undefined,
    email: readField(row, aliases.email) || undefined,
    phone: readField(row, aliases.phone) || undefined,
    status,
  };
}

export function StudentImportModal({
  open,
  onClose,
  token,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ImportStudentRow[]>([]);
  const [filename, setFilename] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [parsingError, setParsingError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportStudentsResult | null>(null);

  const preview = useMemo(() => rows.slice(0, 8), [rows]);

  const reset = () => {
    setRows([]);
    setFilename('');
    setDefaultPassword('');
    setParsingError('');
    setResult(null);
    setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const chooseFile = async (file?: File) => {
    setParsingError('');
    setResult(null);
    setRows([]);
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() !== 'petunjuk') || workbook.SheetNames[0];
      if (!sheetName) throw new Error('Workbook tidak memiliki worksheet.');
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
      const mapped = raw.map(mapRow).filter((row) => row.name || row.username || row.className);
      if (!mapped.length) throw new Error('Tidak ada data peserta yang terbaca. Gunakan template yang tersedia.');
      if (mapped.length > 5000) throw new Error('Maksimal 5.000 peserta dalam satu file import.');
      setFilename(file.name);
      setRows(mapped);
    } catch (error) {
      setParsingError(error instanceof Error ? error.message : 'File Excel tidak dapat dibaca.');
    }
  };

  const submit = async () => {
    if (!rows.length || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await getExamApi().importStudents(token, rows, defaultPassword.trim() || undefined);
      setResult(response);
      if (response.created || response.updated) onImported();
    } catch (error) {
      setResult({ created: 0, updated: 0, skipped: rows.length, errors: [error instanceof Error ? error.message : 'Import gagal.'] });
    } finally {
      setBusy(false);
    }
  };

  return <Modal open={open} onClose={close} title="Import peserta dari Excel" size="large">
    <div className="student-import-layout">
      <section className="import-source-card">
        <FileSpreadsheet size={28}/>
        <div>
          <strong>1. Gunakan template peserta</strong>
          <p>Kolom utama: nama_lengkap, username/NIS, kelas, password, email, no_hp, status.</p>
        </div>
        <a className="button secondary" href="/templates/student-import-template.xlsx" download>
          <Download size={17}/>Download template
        </a>
      </section>

      <section className="import-source-card">
        <Upload size={28}/>
        <div>
          <strong>2. Pilih file Excel</strong>
          <p>Mendukung .xlsx dan .xls. Maksimal 5.000 peserta per proses import.</p>
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={(event)=>chooseFile(event.target.files?.[0])}/>
        {filename && <small className="muted">Terbaca: {filename} • {rows.length.toLocaleString('id-ID')} baris</small>}
      </section>
    </div>

    <label className="import-default-password">
      Password default untuk peserta baru <small>(opsional)</small>
      <input type="password" value={defaultPassword} onChange={(event)=>setDefaultPassword(event.target.value)} placeholder="Dipakai jika kolom password di Excel kosong"/>
      <small>Peserta lama tidak akan berubah password bila kolom password Excel kosong. Untuk keamanan, sebaiknya gunakan password unik bila memungkinkan.</small>
    </label>

    {parsingError && <div className="form-error"><AlertCircle size={17}/>{parsingError}</div>}

    {rows.length > 0 && <section className="import-preview">
      <div className="import-preview-head"><div><strong>Preview data</strong><small>{rows.length.toLocaleString('id-ID')} peserta siap divalidasi di server</small></div></div>
      <div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Kelas</th><th>Email</th><th>Status</th></tr></thead><tbody>
        {preview.map((row,index)=><tr key={`${row.username}-${index}`}><td>{row.name || <em>kosong</em>}</td><td>{row.username || <em>kosong</em>}</td><td>{row.className || <em>kosong</em>}</td><td>{row.email || '—'}</td><td>{row.status}</td></tr>)}
      </tbody></table></div>
      {rows.length > preview.length && <small className="muted">Menampilkan 8 baris pertama dari {rows.length.toLocaleString('id-ID')} baris.</small>}
    </section>}

    {result && <section className={`import-result ${result.errors.length ? 'has-errors' : 'success'}`}>
      <div className="import-result-summary">
        {result.errors.length ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}<strong>Hasil import</strong>
        <span>Dibuat <b>{result.created}</b></span><span>Diperbarui <b>{result.updated}</b></span><span>Dilewati <b>{result.skipped}</b></span>
      </div>
      {result.errors.length > 0 && <div className="import-errors"><strong>{result.errors.length} baris bermasalah:</strong><ol>{result.errors.slice(0,100).map((error,index)=><li key={index}>{error}</li>)}</ol>{result.errors.length>100&&<small>Hanya 100 error pertama yang ditampilkan.</small>}</div>}
    </section>}

    <div className="form-actions import-actions">
      <button type="button" className="button secondary" onClick={close}>Tutup</button>
      <button type="button" className="button primary" disabled={!rows.length||busy} onClick={submit}><Upload size={17}/>{busy?'Mengimpor...':`Import ${rows.length ? rows.length.toLocaleString('id-ID') : ''} Peserta`}</button>
    </div>
  </Modal>;
}
