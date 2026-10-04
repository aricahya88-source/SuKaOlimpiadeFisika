# Arsitektur SainsMasemba

```text
GitHub
  |
  v
Vercel — Next.js PWA
  |
  | HTTPS JSON (text/plain POST)
  v
Google Apps Script Web App
  |                         |
  v                         v
Google Sheets            Google Drive
Database                 Gambar soal

HP siswa
  |- Memory               state aktif
  |- IndexedDB            backup jawaban minimal
  `- Service Worker       shell/static cache
```

## Alur ujian

```text
Login
 -> getAvailableExams
 -> Preflight
 -> startExam
 -> initial batch 1-10
 -> timer aktif
 -> jawab di memory + IndexedDB
 -> prefetch 11-20 ketika mendekati akhir batch
 -> autosave batch ke Apps Script
 -> offline: lanjut dari batch yang sudah ada
 -> reconnect: sync
 -> review
 -> submitExam
 -> backend score
 -> server acknowledgement
 -> local backup dihapus
```

## Source of truth

- Server/Google Sheets = source of truth.
- IndexedDB = temporary resilience layer.
- Service Worker tidak meng-cache response API Apps Script.

## State penting

- `attemptId` = identitas satu sesi pengerjaan.
- `revision` = mencegah payload lama menimpa state baru.
- `submissionId` = idempotency key final submit.
- `expiresAt` = timer dari backend.
