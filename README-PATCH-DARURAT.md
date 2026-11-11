# PATCH DARURAT — Login & Token SuKa Olimpiade Fisika

Untuk kondisi ujian berlangsung dengan sekitar 30 peserta. Dibuat dari ZIP `SuKaOlimpiadeFisika-main (2).zip` yang Anda kirim.

## Isi patch

1. `src/lib/server/service.ts`
   - Login, pembacaan data ujian, dan pemantauan tidak lagi mengantri pada kunci global setiap transaksi.
   - Memulai ujian tetap aman dari klik ganda dengan kunci terpisah untuk setiap peserta dan ujian.
   - Operasi tulis lain (termasuk menyimpan jawaban dan mengumpulkan) tetap memakai kunci global agar perilaku konsistensi sebelumnya tidak berubah.
2. `src/app/api/exam/route.ts`
   - Pesan *server sibuk* dibedakan dari masalah konfigurasi.
   - Log Netlify mencatat nama aksi, kode error, dan kategori, tanpa username, password, token, atau jawaban.

Patch ini **tidak menjalankan SQL, tidak menghapus data, tidak mengubah skema, dan tidak mereset pengerjaan peserta**.

## Cara memasang dengan cepat

1. Buka repository GitHub yang TERHUBUNG ke situs Netlify SuKa Olimpiade Fisika.
2. Ganti persis dua file di lokasi yang sama dengan file dalam ZIP patch ini. Jangan mengunggah folder `SuKa-Patch-Darurat` sebagai folder baru di dalam proyek.
3. Commit perubahan, lalu jalankan satu deployment Netlify dari commit tersebut. Pastikan status deploy `Published`/`Production` (bukan preview).
4. Pastikan environment lama **tetap** ada: `DATABASE_URL` di Functions dan `NEXT_PUBLIC_API_MODE=neon` saat Build. Jangan membagikan nilai `DATABASE_URL`.
5. Periksa `https://sukaolimpiadefisika.netlify.app/api/health`: hasil yang diharapkan adalah `{"ok":true,"backend":"neon"}`.
6. Uji dengan **1 akun peserta yang memang sudah ada**: login, buka ujian, masukkan token, simpan satu jawaban. Setelah berhasil, coba beberapa peserta lain, lalu seluruh peserta.

## Bila masih terjadi kesalahan

- Jangan reset database, tabel, akun, maupun pengerjaan yang sedang berjalan.
- Jangan menghapus data browser peserta: ada cadangan jawaban lokal di perangkat masing-masing.
- Buka log Netlify Functions untuk endpoint `/api/exam` dan catat `code` serta `category` pada baris `[exam-api]`; kirim tangkapan layar yang tidak berisi kredensial atau data siswa.
- Periksa jumlah peserta yang sudah memiliki status pengerjaan, lalu putuskan tambahan waktu ujian bila diperlukan.

## Batasan

Ini patch darurat hasil audit source ZIP, **belum diuji beban 30 peserta pada database Neon live Anda**. Jika versi source yang sedang dideploy berbeda dari ZIP, bandingkan dua file sebelum menggantinya. Patch ini mengurangi antrean login/token, tetapi bukan pengganti refaktor arsitektur untuk 2.000 peserta bersamaan.
