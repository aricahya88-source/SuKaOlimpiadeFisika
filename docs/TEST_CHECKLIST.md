# Checklist Uji Sebelum Ujian Nyata

## Frontend / PWA
- [ ] Login Super Admin/Guru/Siswa
- [ ] Install PWA Android
- [ ] Safe area pada HP notch
- [ ] Refresh halaman setelah login
- [ ] Ujian tampil sesuai kelas
- [ ] Token benar/salah
- [ ] Timer mulai hanya setelah start berhasil
- [ ] Pilihan jawaban touch-friendly
- [ ] Navigator nomor soal
- [ ] Tandai ragu-ragu
- [ ] Prefetch batch berikutnya

## Reliability
- [ ] Matikan internet saat soal sudah terbuka
- [ ] Jawab beberapa soal ketika offline
- [ ] Nyalakan internet dan cek sync
- [ ] Reload saat attempt berjalan
- [ ] IndexedDB gagal / storage penuh simulasi
- [ ] Submit saat internet putus
- [ ] Submit ulang setelah response timeout
- [ ] Pastikan submission tidak dobel
- [ ] Waktu habis otomatis submit / meminta koneksi jika offline

## Admin
- [ ] CRUD ujian
- [ ] Randomisasi soal
- [ ] Randomisasi opsi
- [ ] CRUD peserta
- [ ] CRUD soal
- [ ] Import CSV
- [ ] Upload gambar
- [ ] Monitoring
- [ ] Hasil dan ekspor CSV

## Load test minimum
Uji dengan jumlah perangkat/akun mendekati kondisi nyata sekolah, terutama pada tiga momen:
1. login serentak;
2. start exam serentak;
3. final submit pada menit yang sama.
