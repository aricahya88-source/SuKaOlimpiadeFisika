# SainsMasemba — Mobile Exam PWA Full Feature (3 Peran)

SainsMasemba adalah **platform ujian/ulangan**, bukan LMS. Aplikasi ini mobile-first, installable sebagai PWA, online-first namun tetap toleran terhadap koneksi yang tidak stabil.

## Tiga peran

### 1. Super Admin
- Dashboard seluruh sistem
- Kelola akun guru
- Kelola akun siswa
- Melihat dan mengelola seluruh ujian
- Menentukan guru pemilik ujian
- Melihat seluruh bank soal, melakukan pemetaan soal, monitoring, dan hasil

### 2. Guru
- Dashboard guru
- Membuat, mengedit, menggandakan, dan menutup ujian miliknya
- Mengelola Bank Soal reusable miliknya dan memetakan soal ke beberapa ujian
- Mengelola akun peserta
- Monitoring attempt hanya pada ujian miliknya
- Melihat/ekspor hasil hanya pada ujian miliknya

### 3. Siswa
- Login dan melihat ujian sesuai kelas
- Preflight check sebelum ujian
- Token ujian opsional
- Batch soal + prefetch
- Navigasi dan tandai ragu-ragu
- IndexedDB minimal backup
- Autosave batch
- Resume attempt
- Final submit idempotent
- Melihat hasil sesuai konfigurasi visibilitas

## Fitur parity dari SainsMasemba lama

Modul inti bukan versi minimal. Versi ini membawa kembali pola pengelolaan SainsMasemba lama:

- WYSIWYG editor: bold, italic, underline, H2/H3, list, link, gambar, tabel, undo/redo
- Source HTML mode
- LaTeX + preview KaTeX
- Gambar dari toolbar WYSIWYG diunggah ke Google Drive
- Pilihan ganda biasa, pilihan ganda kompleks, dan benar/salah
- Penilaian EXACT_MATCH dan PARTIAL_NO_PENALTY
- Opsi A-E, pembahasan rich text, bobot, tingkat kesulitan, status DRAFT/REVIEW/PUBLISHED/ARCHIVED
- Kode topik/kisi-kisi dan stimulus/order
- Import Excel `.xlsx` menggunakan template SainsMasemba lama
- Bank Soal berdiri sendiri dan reusable
- EXAM_QUESTIONS memetakan satu soal ke satu atau lebih ujian tanpa menduplikasi soal
- Pemetaan soal dapat diurutkan dari Pengaturan Ujian
- Deskripsi dan aturan ujian memakai WYSIWYG + LaTeX
- Manajemen seluruh akun Super Admin/Guru/Siswa

## Stack

- Frontend: Next.js 15 + React 19 + TypeScript
- Hosting frontend: Vercel
- Version control: GitHub
- Backend/API: Google Apps Script Web App
- Database: Google Sheets
- File gambar soal: Google Drive
- Backup jawaban kecil: IndexedDB
- Static PWA cache: Service Worker

## Ownership & keamanan role

Setiap record `EXAMS` memiliki `ownerId` yang menunjuk akun guru. Filtering guru dilakukan di Apps Script, bukan hanya UI. Guru tidak dapat membaca/mengubah ujian, soal, monitoring, atau hasil milik guru lain hanya dengan mengganti URL/request.

Role backend:

- `super_admin`
- `teacher`
- `student`

## Mode demo

Default `.env.example` menggunakan `NEXT_PUBLIC_API_MODE=demo`.

Akun demo:

- Super Admin: `superadmin` / `super123`
- Guru Fisika: `guru` / `guru123`
- Guru Biologi: `gurubio` / `guru123`
- Siswa: `siswa` / `siswa123`
- Token ujian Fisika: `FISIKA26`

Jalankan:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Portal

```text
/super-admin   -> Super Admin
/teacher       -> Guru
/student       -> Siswa
```

Route `/admin` lama hanya menjadi compatibility redirect.

## Setup Google Apps Script

1. Buat project Apps Script.
2. Salin seluruh file dalam folder `apps-script/`.
3. Jalankan `setupSainsMasemba()` sekali.
4. Fungsi setup membuat/meng-upgrade schema Google Sheets tanpa mereset data existing.
5. Deploy sebagai Web App.
6. Isi `.env.local`:

```env
NEXT_PUBLIC_API_MODE=apps-script
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
NEXT_PUBLIC_SCHOOL_NAME=Sains Masemba
```

Pada instalasi lama, `setupSainsMasemba()` juga:
- mengubah role legacy `admin` menjadi `super_admin`;
- menambahkan kolom `subject` pada USERS bila belum ada;
- menambahkan kolom `ownerId` pada EXAMS bila belum ada;
- menambahkan author/topik/kisi-kisi pada QUESTIONS;
- membuat sheet `EXAM_QUESTIONS`;
- memigrasikan hubungan legacy `QUESTIONS.examId` menjadi pemetaan reusable tanpa menghapus data lama;
- memberikan owner default pada ujian lama yang belum punya owner.

## Struktur Google Sheets

- USERS
- EXAMS
- QUESTIONS
- EXAM_QUESTIONS
- ANSWER_KEYS
- ATTEMPTS
- SUBMISSIONS
- SESSIONS
- AUDIT_LOG

Field penting tambahan:

```text
USERS.role     = super_admin | teacher | student
USERS.subject  = mata pelajaran guru
EXAMS.ownerId  = userId guru pemilik ujian
QUESTIONS.authorId = pemilik soal bank
EXAM_QUESTIONS = pemetaan examId <-> questionId + orderNo
```

## Deploy GitHub + Vercel

Push repository ke GitHub lalu hubungkan repository tersebut ke Vercel. Source Apps Script dapat dikelola dengan `clasp` bila diinginkan.

## Prinsip keamanan

- Answer key tidak pernah dikirim ke frontend siswa.
- Browser tidak membaca Google Sheets langsung.
- Role dan ownership divalidasi server-side.
- Apps Script memvalidasi session, attempt, waktu, question ID, dan submission.
- Password menggunakan HMAC-SHA256 + salt + pepper Script Properties.
- Final score dihitung backend.
- Backup lokal baru dibersihkan setelah acknowledgement submit.

## Catatan build

Environment pembuatan ZIP tidak berhasil menyelesaikan `npm install` karena download dependency melewati batas waktu runtime. Seluruh file Apps Script telah lolos pemeriksaan sintaks `node --check`, dan verifier statis tersedia melalui `npm run verify`. Jalankan `npm install && npm run typecheck && npm run build` pada mesin lokal/GitHub Actions sebelum deploy production.
