# SuKa Olimpiade Fisika — HOTFIX v4.3 (Netlify TypeScript)

**Target:** repositori yang sudah memakai PATCH v4/v4.1/v4.2.  
**Kesalahan yang diperbaiki:** `Property 'answers' does not exist on type 'StartExamResponse | ResumeAttemptResponse'` di `src/app/student/exam/[examId]/page.tsx`.

## Perubahan

Satu file kode saja yang berubah: `src/app/student/exam/[examId]/page.tsx`.

- Respons jalur melanjutkan ujian kini menggunakan `const resumed: ResumeAttemptResponse`; mengakses `resumed.answers` dan `resumed.questions`.
- Respons jalur memulai ujian menggunakan `const started: StartExamResponse`; mengakses `started.initialQuestions`.
- `let activeAttempt: Attempt` membawa data attempt yang sama ke logika timer.
- Tidak menggunakan `any` atau menonaktifkan TypeScript.
- Tidak mengubah mesin penilaian, API, SQL, tabel, variabel lingkungan, atau `netlify.toml`.

## Cara memasang (hotfix kecil)

1. Cadangkan/commit keadaan repository sekarang.
2. Ekstrak ZIP hotfix dan salin **hanya** file `src/app/student/exam/[examId]/page.tsx` ke lokasi yang sama di repo GitHub. Pertahankan struktur folder termasuk `[examId]`.
3. Commit perubahan, lalu periksa build Netlify. Jangan deploy di saat peserta sedang ujian.
4. Jika mesin lokal memiliki dependensi: jalankan `npm ci`, `npm run typecheck`, `npm run build`, kemudian `node --test tests/recovery-patch.test.cjs`.
5. Setelah deploy berhasil, gunakan akun UJI khusus untuk mencoba: memulai ujian, melanjutkan ujian, autosave, waktu habis, pengumpulan, dan hasil. Jangan menguji dengan jawaban peserta nyata.

## Hasil audit sebelum diserahkan

- Terjadi di basis kode v4.2 yang ada pada ZIP repositori lengkap pengguna.
- Penanganan properti `answers`, `questions`, dan `initialQuestions` kini dipisahkan menurut tipe respons yang benar.
- Unit test perlindungan jawaban: 11/11 lulus (simulasi lokal).
- Parsing sintaks seluruh TS/TSX: diperiksa terpisah.
- **Build penuh dan uji deployment Netlify belum diverifikasi** karena instalasi dependensi dari registry npm tidak tersedia di lingkungan ini.

## Keamanan database

Patch ini hanya mengubah satu file antarmuka. **Jangan menjalankan `npm run db:migrate` atau reset data** untuk hotfix ini. Aplikasi yang gagal build tidak melakukan perubahan database melalui proses build. Deploy yang berhasil tetap memerlukan pengujian alur peserta.
