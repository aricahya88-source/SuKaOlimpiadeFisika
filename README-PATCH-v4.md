# SuKa Olimpiade Fisika — PATCH v4 Perlindungan Jawaban Kedaluwarsa

**Sasaran:** Next.js (Netlify) + Neon PostgreSQL, pada source `SuKaOlimpiadeFisika-main` beserta perbaikan patch v3. Paket ini *hanya file yang berubah* dan mempertahankan perubahan v3 (login, antrean request, backup, submit). **Tidak membuat/mengubah tabel, tidak mengubah rumus penilaian, tidak menghapus data**, dan **tidak deploy otomatis**.

## Yang diperbaiki

1. **Autosave:** setiap perubahan disimpan di IndexedDB dan dijadwalkan sinkronisasi server setelah jeda 900 ms; fallback periodik 15 detik. Penulisan cadangan per attempt tetap berurutan (perbaikan v3).
2. **Bukti penerimaan dari server:** `saveAnswers` dan `submitExam` mengembalikan `confirmedAnswers` berisi jawaban nyata yang tersimpan. Client tidak menyamakan HTTP sukses dengan bukti bahwa *seluruh* jawabannya sudah tersimpan.
3. **Antrean database melewati tenggat:** batas waktu diperiksa menggunakan timestamp *server-side* saat seluruh body HTTP diterima, bukan saat akhirnya masuk giliran transaksi. **Tidak percaya timestamp yang dikirim browser dan menolak parameter ekstra yang mencoba menyelundupkan cap waktu palsu.**
4. **Timer:** perhitungan mundur memakai jam dari server yang dipasangkan dengan `performance.now()`; sesudah 00:00 jawaban dikunci dan tidak dapat diubah.
5. **Offline:** backup dipertahankan; ketika koneksi pulih, percobaan pengumpulan bisa dilakukan lagi tanpa membuka opsi mengubah jawaban.
6. **Verifikasi pengumpulan:** setelah server mengonfirmasi submit, aplikasi membandingkan jawaban server dengan snapshot lokal. Jika cocok, backup boleh dihapus. **Jika tidak cocok, backup TIDAK dihapus**, dan peserta memperoleh pesan *Perlu pemeriksaan panitia*.
7. **Mode demo:** aturan deadline disamakan dengan Neon, agar simulasi uji tidak mengizinkan jawaban baru setelah waktu selesai.

## Delapan file patch

- `src/app/student/exam/[examId]/page.tsx` — frontend autosave, timer, lock, recovery, dan tampilan konfirmasi.
- `src/app/api/exam/route.ts` — cap waktu server setelah seluruh payload diterima, logging error aman (mempertahankan v3).
- `src/lib/exam-store.ts` — backup IndexedDB berurutan, metadata `lockedAt` (mempertahankan v3).
- `src/lib/answer-sync.ts` — pembanding snapshot lokal dengan jawaban server.
- `src/lib/api/types.ts` — tipe respons `confirmedAnswers` opsional untuk kompatibilitas.
- `src/lib/server/engine.ts` — acknowledgement isi jawaban, deadline demo, dan idempotensi submit.
- `src/lib/server/service.ts` — penerapan deadline berdasarkan timestamp HTTP yang dipercaya dan perubahan antrean v3.
- `tests/recovery-patch.test.cjs` — 11 skenario tes otomatis (Node.js).

## Langkah pasang (tidak menyentuh produksi otomatis)

1. **Wajib backup atau commit** repo yang benar-benar terhubung dengan website aktif. Pastikan jangan sedang ada peserta mengerjakan.
2. Pastikan konfigurasi aplikasi sekarang memakai `NEXT_PUBLIC_API_MODE=neon`. Patch backend ini ditargetkan ke Neon; **Apps Script tidak termasuk dalam pengujian patch ini**.
3. Ekstrak ZIP lalu **salin isi `src/` dan `tests/`** ke root repo yang sama; timpa hanya path identik. **Jangan buat folder `SuKa-PATCH-v4-...` di dalam `src`**.
4. Jika ada perubahan lain pada 7 file kode sejak patch v3, **bandingkan/merge**, jangan langsung overwrite. Source rujukan adalah `SuKaOlimpiadeFisika-main (2).zip` + `SuKa-PATCH-v3-LOGIN-AUTOSAVE-PENGUMPULAN.zip`.
5. Pada repo, jalankan:

   ```bash
   npm ci
   npm run typecheck
   node --test tests/recovery-patch.test.cjs
   npm run test:neon
   npm run build
   ```

6. **Uji akun DEMO/tes** (jangan pakai akun atau data ujian peserta nyata): pilih beberapa jawaban, pindah halaman, reload, kirim, periksa hasil dan status server; coba internet terputus, kembali online, dan timer 00:00; uji 4 tipe soal dan duplikasi submit.
7. Hanya setelah semua tes selesai, deploy **sekali pada waktu tidak ada ujian aktif**. Pastikan URL dan backend benar; jangan reset attempt maupun database.
8. Jika perlu rollback, kembalikan 7 file kode sebelumnya dari git commit cadangan lalu deploy ulang; jangan hapus IndexedDB peserta.

## Ketentuan keamanan waktu

- **Tidak ada tambahan 2 menit untuk menjawab**. Permintaan yang payload lengkapnya sudah diterima server **sebelum** batas waktu dapat diproses walau database mengantre. Permintaan yang baru diterima setelah waktu habis **tidak dapat mengubah jawaban**.
- Jawaban yang hanya berada di laptop dan belum pernah sampai server sebelum tenggat **tidak otomatis sah**. Backup sengaja disimpan untuk pemeriksaan panitia, **bukan bukti tak terbantahkan tentang waktu jawaban dibuat**.
- Jika perangkat/penyimpanan rusak permanen sebelum sinkronisasi, pemulihan jawaban yang hanya ada secara lokal **tidak dapat dijamin**.
- Tidak ada klaim ketahanan 2.000 pengguna serentak: backend masih menggunakan lock tulis bersama dan perlu uji beban terpisah.

## Hasil pemeriksaan pengembang patch

- **11/11 tes otomatis lulus** menggunakan Node `node:test`, engine penilaian riil dan adaptor transaksi server tiruan, termasuk permintaan sebelum/sesudah deadline dan pengumpulan idempoten.
- Seluruh file TypeScript/TSX yang berubah lolos pemeriksaan sintaks dengan `typescript.transpileModule`.
- Rumus penilaian di `src/lib/grading.ts` tidak diubah.
- **Belum** lulus tes Next.js build/TypeScript penuh, tes browser IndexedDB sesungguhnya, atau uji transaksi Neon produksi. Instalasi `npm ci` di lingkungan penyiapan terhenti karena akses paket tidak tersedia. **Wajib jalankan perintah di atas sebelum deploy.**
- ZIP patch hanya bersifat artefak untuk di-merge; **belum dipasang ke website aktif**.

## Perilaku peserta jika terjadi masalah

Setelah waktu habis, layar menunjukkan jawaban dikunci. Bila server belum dapat dihubungi, peserta tetap berada pada perangkat/browser yang sama dan mencoba konfirmasi lagi setelah online. Jika server berhasil menerima pengumpulan tetapi ada jawaban yang berbeda, layar menampilkan *Perlu pemeriksaan panitia* beserta ID pengerjaan. **Jangan hapus data browser atau mengganti perangkat sebelum panitia mengecek.**
