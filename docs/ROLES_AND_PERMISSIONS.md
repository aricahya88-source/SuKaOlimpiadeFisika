# Roles & Permissions

| Fitur | Super Admin | Guru | Siswa |
|---|---|---|---|
| Dashboard global | Ya | Tidak | Tidak |
| Kelola akun guru | Ya | Tidak | Tidak |
| Kelola akun siswa | Ya | Ya | Tidak |
| Lihat semua ujian | Ya | Tidak | Sesuai kelas |
| CRUD ujian | Semua | Hanya milik sendiri | Tidak |
| Bank soal | Semua | Hanya ujian sendiri | Tidak |
| Upload gambar soal | Ya | Ya | Tidak |
| Monitoring | Semua | Hanya ujian sendiri | Tidak |
| Hasil | Semua | Hanya ujian sendiri | Milik sendiri jika visible |
| Kerjakan ujian | Tidak | Tidak | Ya |

## Ownership

`EXAMS.ownerId` adalah `userId` dari akun guru. Semua endpoint manager memeriksa ownership di Apps Script. Super Admin melewati filter ownership, sedangkan Guru hanya menerima data yang `ownerId`-nya sama dengan akun login.
