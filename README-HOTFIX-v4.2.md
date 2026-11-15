# SuKa Olimpiade Fisika — HOTFIX v4.2 (disesuaikan dengan repositori lengkap)

Basis: `SuKaOlimpiadeFisika-main (3).zip` dari pengguna, 15 November 2026.
Tujuan: memperbaiki kegagalan Netlify TypeScript pada `src/app/student/exam/[examId]/page.tsx:343`.

## Perubahan kode

Hanya `src/app/student/exam/[examId]/page.tsx` yang diubah dari repositori pengguna:
- impor dua tipe `StartExamResponse` dan `ResumeAttemptResponse` dari `@/lib/api`
- `let response;` menjadi `let response: StartExamResponse | ResumeAttemptResponse;`

File lain—termasuk engine penilaian, penyimpanan jawaban, API, dan konfigurasi Netlify—tetap sama dengan repositori pengguna.
Patch ini menggantikan HOTFIX v4.1 untuk basis repositori yang diunggah. **Jangan** menerapkan ZIP v4.1 dan v4.2 sekaligus.

## Cara menerapkan

**Opsi A — hotfix kecil**: Salin isi folder `src/` dari ZIP HOTFIX ini ke **root** repo GitHub, pertahankan struktur path, dan timpa file `src/app/student/exam/[examId]/page.tsx` saja. Jangan mengunggah ZIP sebagai satu file ke GitHub.

**Opsi B — repositori lengkap**: Ekstrak ZIP REPO-LENGKAP; upload/commit **isinya**, bukan folder pembungkus, sehingga `package.json`, `netlify.toml`, `src/` berada di root repository. Jangan lakukan ini jika ada perubahan kode baru di GitHub yang belum ada pada ZIP pengguna (lakukan merge dulu).

Verifikasi lokal/Netlify:

```bash
npm ci
npm run typecheck
node --test tests/recovery-patch.test.cjs
npm run build
```

Setelah build sukses, gunakan akun tes untuk mengecek autosave, pengumpulan, perlindungan jawaban saat kedaluwarsa, dan empat tipe soal. Deploy hanya di luar jam ujian.

## Hasil verifikasi yang **sudah** dilakukan
- Perbandingan repositori vs v4.1: tujuh dari delapan file patch identik; satu file perbedaan di deklarasi/impor tipe.
- 11/11 tes regresi `tests/recovery-patch.test.cjs` lulus (adaptor server tiruan, **bukan** database produksi).
- Pemeriksaan sintaks 80 file TypeScript/TSX: 0 kesalahan sintaks.
- Pengujian TypeScript terisolasi untuk tipe respons start/resume: lulus.
- `node scripts/verify.mjs`: lulus.
- Hanya satu file kode berubah dibanding ZIP repositori yang Anda unggah; rumus penilaian dan database tidak diubah.

## Batasan dan keamanan
- **Belum dapat memverifikasi `npm ci`, `npm run typecheck`, atau `npm run build` secara penuh**, karena lingkungan ini tidak dapat mengakses `registry.npmjs.org` (DNS gagal). Build Netlify berikutnya menjadi penentu.
- Belum ada pengujian otomatis browser IndexedDB, backend Neon produksi, maupun beban 2.000 peserta.
- Jangan jalankan `apply-netlify-fix.sh` hanya untuk error TypeScript ini: script tersebut menghapus `package-lock.json` dan bukan penyelesaian yang dibutuhkan.
- **Tidak menjalankan deploy, migrasi, reset, maupun perubahan data peserta.**
- Bila Netlify masih gagal, kirim seluruh bagian log mulai `Linting and checking validity of types` sampai error terakhir untuk memperbaiki kasus berikutnya, bukan menebak.
