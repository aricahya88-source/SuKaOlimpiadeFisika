# Patch SuKa Olimpiade Fisika — Ujian Aktif Otomatis

**Patch:** v1.0 (8 November 2026)  
**Sumber:** ZIP `SuKaOlimpiadeFisika-main (1).zip` yang diberikan pengguna.  
**Target:** Next.js + Netlify + backend Neon. Mode demo juga diselaraskan.

## Masalah yang diperbaiki

Pada `/student`, ujian berstatus `SCHEDULED` terlihat dalam bagian **Ujian berikutnya**, tetapi menghilang ketika waktu mulai tercapai. Halaman siswa membaca `exam.availableNow`, sementara backend Neon belum mengisi nilai itu. Halaman juga tidak memiliki pembaruan waktu otomatis.

## Isi patch — hanya file berikut

| File | Keterangan |
| --- | --- |
| `src/lib/exam-availability.ts` | **BARU:** aturan terpusat untuk status, waktu mulai, waktu selesai, dan visibilitas. |
| `src/lib/server/engine.ts` | Memasukkan `availableNow` ke respons ujian Neon dan menyembunyikan status DRAFT/ARCHIVED. |
| `src/lib/api/demo-api.ts` | Menyamakan perilaku dengan backend Neon saat mode demo. |
| `src/app/student/page.tsx` | Jam lokal otomatis setiap detik, sinkronisasi server setiap 60 detik/saat tab aktif kembali, dan perhitungan ujian yang sedang berlangsung. |
| `tests/exam-availability.test.ts` | **BARU:** tes batas waktu, status dan attempt. |
| `tests/neon.test.ts` | Memastikan respons Neon mengandung `availableNow` serta status DRAFT tidak terlihat; melengkapi data contoh validator. |

## Cara memasang

1. Cadangkan versi kode GitHub saat ini (misalnya melalui branch terpisah).
2. Ekstrak ZIP patch ini.
3. Salin folder `src` dan `tests` dari patch ke **akar repositori proyek** (sejajar dengan `package.json`), pilih **gabungkan folder / timpa file yang namanya sama**. Jangan menghapus folder yang sudah ada.
4. Jalankan dari akar proyek:

   ```bash
   npm ci
   npm run typecheck
   node --import tsx --test tests/exam-availability.test.ts
   npm run test:neon
   npm run build
   ```

5. Jika semua lolos, commit dan push perubahan ke branch yang terhubung dengan Netlify. Periksa hasil deploy Netlify dan buka `/student` menggunakan akun peserta uji.

**Penting:** ZIP ini bukan seluruh proyek. Jangan deploy ZIP patch ini sebagai proyek baru. **Tidak perlu menjalankan migrasi atau SQL** dan tidak perlu mengubah kredensial Neon maupun variabel Netlify. Jangan mengunggah folder `node_modules`.

## Pengujian manual wajib sebelum ujian nyata

1. Buat ujian uji pada kelas peserta yang sesuai, status `SCHEDULED`, dengan minimal satu soal `PUBLISHED` yang sudah dipetakan ke ujian.
2. Jadwalkan waktu mulai **2–3 menit ke depan**, waktu selesai **10–15 menit setelahnya** (form admin menggunakan WIB).
3. Login sebagai peserta dari kelas tersebut dan biarkan halaman `/student` tetap terbuka.
4. Sebelum waktu mulai, ujian harus tampil pada **Ujian berikutnya**.
5. Tepat saat waktu mulai, ujian harus pindah ke **Tersedia untuk Anda** dengan label **Sedang berlangsung** dan tombol **Persiapkan ujian**, tanpa reload manual.
6. Jalankan ujian dari akun uji, pastikan status menjadi **Sedang dikerjakan**. Uji pembaruan saat kembali ke tab dan saat refresh.
7. Setelah `SUBMITTED`, ujian tidak boleh bisa dimulai lagi. Ujian `DRAFT` tidak boleh terlihat oleh siswa.
8. Pastikan waktu selesai menonaktifkan kesempatan memulai pengerjaan baru.

## Catatan teknis

- Waktu dibandingkan sebagai timestamp ISO/UTC; formulir jadwal admin tetap ditampilkan dalam WIB.
- Backend tetap menjadi otoritas akhir untuk izin `startExam` sehingga tampilan jam perangkat yang tidak akurat tidak membuka ujian di luar jadwal.
- `availableNow` tetap dikirim dari server, tetapi halaman juga menghitung interval waktu pada klien agar tidak menunggu polling ketika batas jadwal tercapai.
- Polling 60 detik hanya dijalankan ketika tab terlihat; pada saat fokus kembali/online data disegarkan.
- Patch dibuat dan diuji terhadap source code unggahan tanggal 12 Oktober 2026. Jika branch GitHub telah berubah signifikan sejak saat itu, tinjau perbedaan sebelum menimpa file.

## Validasi paket sebelum pengiriman

- `npm run typecheck` — lulus.
- `node --import tsx --test tests/exam-availability.test.ts` — 4 tes lulus.
- `npm run test:neon` — tes integrasi lulus.
- `npm run verify` — lulus.
- `npm run build` — lulus (Next.js production build).

Belum dilakukan deployment dan belum dilakukan tes terhadap data Neon produksi. Lakukan tes akun peserta uji setelah patch masuk ke deployment Netlify.
