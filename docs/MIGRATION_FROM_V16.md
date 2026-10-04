# Audit & Migrasi dari SainsMasemba V16

Source lama yang menjadi basis audit adalah monorepo Next.js dengan empat portal (`super-admin`, `guru`, `siswa`, `orang-tua`), shared packages, Prisma/Neon PostgreSQL, dan Vercel Blob. Versi baru sengaja disederhanakan karena tujuan produk ditetapkan kembali menjadi aplikasi ujian murni.

## Mapping

| Lama | Baru |
|---|---|
| Neon PostgreSQL / Prisma | Google Sheets melalui Apps Script |
| Vercel Blob | Google Drive untuk gambar soal |
| 4 portal terpisah | 1 Next.js PWA dengan role super_admin/teacher/student |
| fitur LMS / materi | dihapus dari scope |
| UI neumorphism | Modern Flat SaaS + Bento + Blue/Teal |
| full server dependence | online-first + prefetch + IndexedDB backup |

## Yang dipertahankan

- identitas/logo SainsMasemba;
- Next.js/TypeScript;
- pola role siswa/guru/super admin;
- prinsip keamanan CSP;
- deployment frontend di Vercel.

## Yang tidak dibawa

Materi, topik belajar, orang tua, fitur LMS, dan dependency Prisma/Blob tidak dibawa karena di luar scope aplikasi ujian.
