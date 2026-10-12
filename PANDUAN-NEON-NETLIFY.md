# Pemasangan Neon + Netlify

Paket ini adalah aplikasi lengkap hasil revisi source terlampir. Backend menggunakan Next.js Route Handlers pada `/api/exam`, PostgreSQL Neon, dan runtime Next.js Netlify. Tidak memakai Apps Script dalam mode Neon.

## 1. Buat database Neon

Buat proyek Neon dan pilih database/branch yang akan digunakan. Buka SQL Editor lalu jalankan seluruh isi `database/001-schema.sql`. SQL dapat dijalankan kembali tanpa menghapus data.

Buka **Connect**, pilih pooled connection string (hostname memuat `-pooler`). Simpan connection string hanya pada environment server. Jangan unggah password/connection string ke GitHub.

## 2. Siapkan source

Ekstrak ZIP dan unggah ISI folder `SuKaOlimpiadeFisika-main` ke root repository yang terhubung ke Netlify. File `package.json`, `package-lock.json`, `netlify.toml`, `src/` dan `database/` harus berada di root. Gunakan lockfile baru dalam paket ini.

## 3. Buat akun Super Admin pertama

Akun demo tidak berlaku untuk database Neon. Tidak ada password admin bawaan. Di komputer lokal dengan Node.js 22+, jalankan:

```bash
npm ci
```

Salin `.env.example` menjadi `.env.local`. Isi `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `ADMIN_NAME`. Jangan commit `.env.local`.

```bash
npm run db:migrate
npm run db:create-admin
```

Perintah create-admin membuat akun baru, tidak menimpa akun existing. Bila username sudah ada, gunakan akun tersebut; jangan menjalankan create-admin berulang untuk username yang sama. Password disimpan sebagai hash scrypt bersalt; sesi di database disimpan sebagai hash token.

## 4. Konfigurasi Netlify

Pada pengaturan site, buka **Environment variables** dan tambahkan:

| Nama | Nilai | Scope |
|---|---|---|
| `DATABASE_URL` | pooled connection string Neon | Functions (dan Builds jika UI meminta) |
| `NEXT_PUBLIC_API_MODE` | `neon` | Builds |

Jangan menggunakan `NEXT_PUBLIC_DATABASE_URL`. `ADMIN_PASSWORD` dan `ADMIN_USERNAME` tidak diperlukan pada Netlify karena hanya digunakan script lokal. Hapus konfigurasi lama yang memaksa mode demo atau Apps Script. Pastikan Base directory sesuai root aplikasi, Build command `npm run build`, Publish directory `.next`, Node 22. Adapter Next.js modern Netlify dideteksi otomatis; jangan gunakan static export atau redirect SPA `/* /index.html 200`.

Lakukan redeploy setelah environment diubah. Mode API ditentukan saat build. File `netlify.toml` menetapkan default mode Neon.

## 5. Periksa koneksi

Buka `https://DOMAIN-NETLIFY/api/health`. Respons sukses:

```json
{"ok":true,"backend":"neon"}
```

Jika 503, periksa `DATABASE_URL`, scope Functions, dan apakah SQL sudah dijalankan pada database/branch yang sama. Periksa log Functions tanpa membagikan kredensial.

Login menggunakan admin yang dibuat tadi. Buat Panitia, Validator, dan Peserta melalui menu pengguna. Password akun baru minimal 8 karakter. Buat bank soal, publish soal, buat ujian dengan kelas peserta dan jadwal yang aktif, lalu pilih soal untuk ujian. Coba login dari browser lain: data harus sama. Coba simpan jawaban, refresh, jeda/lanjutkan melalui monitoring, kumpulkan, dan periksa hasil.

## Perilaku backend

- Pengguna, ujian, soal, mapping, validasi, penugasan kompatibilitas, pengerjaan, pengumpulan, dan sesi tersimpan di tabel terpisah.
- Data tiap entitas memakai JSONB agar kompatibel dengan field aplikasi existing; id dan indeks kritis menggunakan kolom/index PostgreSQL.
- Token ujian dan kunci jawaban tidak dikirim dalam respons pengerjaan peserta. Hasil hidden tidak dikirim ke peserta.
- Konten dan kunci soal disalin ke snapshot saat ujian dimulai. Edit soal berikutnya tidak mengubah soal/nilai pengerjaan tersebut.
- Ujian hanya dapat dimulai oleh peserta kelas yang sesuai, dalam jadwal aktif. Lewat tenggat, jawaban baru tidak diterima; pengumpulan memakai jawaban yang sudah disimpan.
- Pengumpulan ulang idempotent berdasarkan attempt. Revisi lama tidak menimpa jawaban baru.
- Password baru atau akun dinonaktifkan akan mencabut sesi akun tersebut. Sesi berlaku 12 jam. Login gagal dibatasi 10 kali per 15 menit per kombinasi IP/username.
- Validator dapat melihat/edit/validasi bank soal. Persetujuan salah satu validator dianggap valid; edit substantif mengembalikan status pending. Menu dan penugasan existing dipertahankan untuk kompatibilitas source yang Anda unggah.
- Gambar kecil (maksimal 1 MB) disimpan sebagai data URL dalam konten soal. Untuk bank gambar besar, gunakan penyimpanan objek pada tahap berikutnya.
- Database baru kosong; data demo/localStorage/Apps Script tidak otomatis dimigrasi. Import ulang peserta dan soal melalui menu aplikasi.

## Batas kapasitas versi ini

Backend memuat state entitas dalam transaksi dan menggunakan advisory lock untuk serialisasi mutasi agar tidak kehilangan pembaruan. Pendekatan ini memprioritaskan konsistensi dan kompatibilitas aplikasi, tetapi perlu refactor menjadi query per entitas sebelum ujian dengan peserta serentak dalam jumlah besar. Jangan menganggap paket ini sudah lulus uji beban olimpiade skala besar.

## Pengujian

```bash
npm run typecheck
npm run test:neon
npm run build
```

Tes backend memakai PostgreSQL lokal berbasis PGlite tanpa kredensial Neon. Tes membuktikan SQL, login, peran, snapshot penilaian, simpan/revisi jawaban, pause, idempotensi submit, logout, dan penyembunyian hasil. Koneksi Neon live dan deployment Netlify tetap harus diuji setelah Anda memasukkan environment.

Rujukan: https://neon.com/docs/get-started-with-neon/connect-neon
https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
