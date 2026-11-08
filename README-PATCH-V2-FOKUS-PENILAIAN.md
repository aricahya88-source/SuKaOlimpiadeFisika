# SuKa Olimpiade Fisika — Patch V2 (Kumulatif)

Patch ini dibuat berdasarkan berkas sumber `SuKaOlimpiadeFisika-main (1).zip`.
Patch V2 **sudah menyertakan perbaikan jadwal/ujian aktif dari Patch V1**.
Jangan hanya mengunggah file ZIP ke Netlify; salin isi foldernya ke repositori
proyek dengan mempertahankan struktur direktori, lalu lakukan deployment.

## A. Mode Fokus + iframe simulasi

1. Saat peserta mengklik/menjalankan simulasi di dalam iframe soal, event
   `window.blur` tidak lagi otomatis dicatat sebagai pelanggaran fokus.
2. Pengecualian terbatas pada iframe komponen simulasi, bukan semua iframe
   atau situs lain. Frame harus memiliki penanda khusus.
3. `document.visibilitychange` ke status `hidden` (tab berpindah,
   aplikasi diminimalkan, dan keadaan yang dilaporkan browser) tetap
   mencatat pelanggaran. Kehilangan fokus ke luar simulasi juga tetap
   dipantau melalui `window.blur`.
4. Keluar dari mode layar penuh *milik simulasi* tidak menghasilkan
   peringatan pelanggaran palsu. Keluar dari layar penuh ujian seperti biasa
   tetap dipantau.

Catatan: browser tidak selalu dapat membedakan semua perpindahan aplikasi
desktop dengan interaksi iframe lintas-origin. Patch memprioritaskan
peristiwa tab tersembunyi yang benar-benar dilaporkan browser.

## B. Skor pilihan ganda kompleks

- **Ketat (EXACT_MATCH): default**, cocok untuk Olimpiade resmi.
  Semua dan hanya pilihan kunci harus dipilih. Jika berbeda, poin soal = 0.
- **Parsial terkoreksi (PARTIAL_CORRECTED):** opsional di formulir
  tambah/edit soal pilihan ganda kompleks untuk latihan atau asesmen.
  Opsi kunci yang dipilih menambah poin; opsi pengecoh yang dipilih
  mengurangi poin. Minimal poin per soal adalah 0.
- Soal kompleks lama dengan `PARTIAL_NO_PENALTY` otomatis dihitung
  dengan rumus parsial terkoreksi *pada pengumpulan baru*.
- Penilaian parsial tanpa penalti untuk soal menjodohkan dan benar/salah
  tidak berubah.

Rumus mode parsial terkoreksi:

`rasio = maks(0, min(1, (benar_dipilih / jumlah_kunci) - (salah_dipilih / jumlah_pengecoh)))`

`poin_soal = bobot_soal × rasio`

Contoh kunci A,C dengan opsi A–E dan bobot 1:

| Jawaban | Ketat | Parsial terkoreksi |
| --- | ---: | ---: |
| A,C | 1 | 1 |
| A | 0 | 0,5 |
| A,B,C | 0 | 0,6667 |
| A,B,C,D,E | 0 | 0 |
| B,D | 0 | 0 |

**Penting:** total nilai adalah persentase jumlah *poin berbobot*, bukan
semata-mata persentase banyaknya soal benar. Dengan bobot sama dan
penilaian ketat, 2 benar dari 5 soal = 40.

## C. Cara memasang

1. Simpan salinan/backup kode repositori GitHub yang saat ini digunakan.
2. Ekstrak ZIP patch ini, lalu salin isi folder ke **root proyek**.
   Jika diminta, ganti hanya file dengan path yang sama.
3. Commit dan push perubahan ke GitHub, kemudian deploy ulang di Netlify.
   Tetap gunakan environment variable Neon sebelumnya; **tidak perlu
   mengubah database atau menjalankan migrasi SQL**.
4. Masuk sebagai Panitia → **Bank Soal** → Tambah/Edit soal →
   **Pilihan Ganda Kompleks** → **Sistem Penilaian**.
   Default adalah **Ketat**. Pilih **Parsial terkoreksi** hanya untuk latihan.
5. Uji dengan peserta uji: buka soal yang berisi simulasi, klik/tarik kontrol
   pada iframe (jumlah pelanggaran tidak bertambah), kemudian beralih tab
   (jumlah pelanggaran bertambah). Uji jawaban A,C; A; A,B,C; A–E.
6. Jika instalasi Anda menggunakan backend *Google Apps Script* (bukan
   konfigurasi Netlify + Neon), perbarui pula `apps-script/Exam.gs` pada
   project Apps Script dan terbitkan ulang versinya.

## D. Verifikasi lokal yang telah dijalankan

- `npm run typecheck` — lulus.
- `npm run verify` — lulus.
- `npm run test:neon` — lulus.
- `node --import tsx --test tests/*.test.ts` — seluruh 14 pengujian lulus.
- `npm run build` — Next.js production build berhasil.

Tes mencakup penilaian ketat dan parsial, pembetulan celah pilih-semua,
perhitungan pengumpulan melalui server PostgreSQL lokal (PGlite),
perhitungan Apps Script, pengawasan iframe vs tab tersembunyi, serta
regresi jadwal ujian aktif.

## E. Batasan dan kehati-hatian

- Patch telah diuji pada kode lokal. **Belum di-deploy atau diverifikasi
  pada akun peserta dan database produksi**; tahap deployment dan uji
  perangkat nyata masih perlu dilakukan pengelola proyek.
- Hasil ujian yang **sudah dikumpulkan** tidak diubah otomatis.
  Koreksi nilai historis memerlukan audit, kebijakan panitia, dan proses
  perhitungan ulang tersendiri.
- Agar nilai peserta konsisten, jangan mengubah kunci atau mode skor
  ketika ujian sedang berlangsung.
