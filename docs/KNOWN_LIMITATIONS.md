# Known Limitations & Keputusan Desain

1. **Apps Script + Sheets bukan database transaksional.** Cocok untuk aplikasi sekolah yang sederhana, tetapi ujian high-stakes skala sangat besar perlu load test dan mungkin backend database khusus.
2. **Google Drive bukan CDN.** Proyek mengoptimalkan dengan memuat gambar hanya saat dibutuhkan dan membiarkan browser cache. Hindari gambar 3–10 MB; targetkan 100–300 KB jika kualitas memungkinkan.
3. **Private signed URL Drive tidak tersedia seperti object storage.** Implementasi default membuat gambar soal `ANYONE_WITH_LINK`; sheet tetap hanya menyimpan `fileId`. Bila kebijakan sekolah melarang hal ini, gunakan object storage/CDN atau proxy file yang dirancang khusus.
4. **PWA tidak dapat mencegah kecurangan 100%.** Setelah konten soal tampil pada perangkat siswa, pengguna perangkat secara prinsip dapat merekam/menyalinnya. Jangan pernah kirim kunci jawaban.
5. **Offline tolerance bukan full-offline exam.** Siswa dapat melanjutkan batch soal yang sudah diprefetch. Batch baru dan final submit memerlukan internet.
6. **Demo mode bukan backend production.** Demo memakai localStorage agar mudah diuji. Gunakan Apps Script mode untuk data nyata.
