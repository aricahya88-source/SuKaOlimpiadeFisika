# SuKa Olimpiade Fisika

Aplikasi ini merupakan pengembangan dari source code Ulangan Harian existing dengan layout, komponen, dan alur utama tetap dipertahankan. Identitas visual telah diganti menjadi SuKa Olimpiade Fisika dan istilah pengguna menjadi Panitia/Peserta.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Mode demo memakai penyimpanan browser agar seluruh alur bisa diuji tanpa konfigurasi backend:

- Super Admin: `superadmin` / `super123`
- Panitia: `panitia` / `panitia123`
- Validator: `validator` / `validator123`
- Peserta: `peserta` / `peserta123`

## Aset identitas

- `public/suka-olimpiade-logo.svg` — logo lengkap
- `public/suka-olimpiade-icon.svg` — icon aplikasi
- `public/favicon.svg` — favicon

## Modul Validator

Validator memiliki menu **Validasi Soal** untuk melihat preview soal, kisi-kisi, panitia pembuat, serta memberi keputusan **Valid**, **Perlu Revisi**, atau **Tidak Layak**. Catatan diwajibkan untuk dua keputusan terakhir.

## Backend produksi

Layer API existing tetap dipakai melalui `getExamApi()`. Untuk produksi, mode API dapat diarahkan ke route handler Next.js/Neon tanpa mengekspos `DATABASE_URL` ke browser. Simulasi fisika belum diaktifkan sesuai permintaan.

## Simulasi melalui iframe

Pada editor Soal / stimulus, klik **Sisipkan Simulasi** di posisi yang diinginkan. Isi URL halaman simulasi HTTPS dari GitHub Pages, Vercel, atau Netlify pada bagian Simulasi Interaktif. URL repository github.com bukan halaman simulasi. Atur judul, deskripsi, dan rasio tampilan; simpan soal. Penanda `[SIMULATION]` menentukan posisi iframe. Jika penanda tidak ada, simulasi tampil sesudah teks stimulus. Soal tanpa simulasi tetap berjalan seperti biasa.

Peserta, Validator, dan preview editor Panitia/Super Admin menggunakan komponen stimulus yang sama. Perubahan pengaturan simulasi membuat persetujuan lama perlu divalidasi ulang. Simulasi yang dihosting di luar aplikasi membutuhkan internet dan host harus mengizinkan embedding iframe. Aplikasi tidak menerima kode iframe mentah melalui WYSIWYG.

Fitur ini tersimpan dalam mode demo browser. Adapter Google Apps Script lama belum mendukung fitur validasi/penugasan baru; migrasi backend Neon belum diimplementasikan dalam paket ini.
