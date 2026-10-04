# Setup Google Apps Script + Sheets + Drive

## A. Buat Apps Script Project

1. Buka Google Apps Script dan buat project baru: `SainsMasemba API`.
2. Salin seluruh file dari folder `apps-script/` ke project.
3. Pastikan timezone project `Asia/Jakarta`.

### Dengan clasp (opsional tetapi direkomendasikan)

```bash
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "SainsMasemba API"
```

Salin `apps-script/.clasp.json.example` menjadi `.clasp.json` dan isi `scriptId`, kemudian:

```bash
cd apps-script
clasp push
```

## B. Setup database otomatis

Di editor Apps Script, jalankan fungsi:

```text
setupSainsMasemba
```

Fungsi tersebut akan:

- membuat `SainsMasemba Database` di Google Sheets;
- membuat sheet USERS, EXAMS, QUESTIONS, ANSWER_KEYS, ATTEMPTS, SUBMISSIONS, SESSIONS, AUDIT_LOG;
- membuat folder `SainsMasemba Question Images` di Google Drive;
- membuat akun Super Admin demo;
- membuat akun Guru demo;
- membuat akun Siswa demo;
- membuat contoh ujian dan soal.

Untuk lingkungan produksi, ganti password akun demo sesegera mungkin. Jika lupa password Super Admin, jalankan:

```text
resetSuperAdminPassword
```

`setupSainsMasemba()` aman dijalankan ulang: sheet yang sudah berisi data tidak dihapus.

## C. Deploy Web App

1. `Deploy` -> `New deployment`.
2. Type: `Web app`.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy.
6. Salin URL yang berakhir `/exec`.

Frontend sengaja mengirim POST dengan `Content-Type: text/plain` berisi JSON. Ini menghindari preflight `OPTIONS` lintas-origin yang tidak ditangani Web App Apps Script.

## D. Konfigurasi frontend

```env
NEXT_PUBLIC_API_MODE=apps-script
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

## E. Gambar soal

Sheet hanya menyimpan `imageFileId`, bukan URL Drive. `Drive.gs` membuat link tampilan saat API mengembalikan soal.

Default setup menggunakan `ANYONE_WITH_LINK` untuk **gambar soal saja** agar browser siswa dapat membacanya secara langsung dan Apps Script tidak menjadi proxy binary. Kunci jawaban tetap terpisah dan tidak pernah ada di file gambar/response frontend.

Jika Google Workspace sekolah melarang link sharing publik, ubah strategi file sebelum production; lihat `KNOWN_LIMITATIONS.md`.


## Akun awal 3 peran

Setelah `setupSainsMasemba()` pada database baru:

- Super Admin: `superadmin` / `super123`
- Guru: `guru` / `guru123`
- Siswa: `siswa` / `siswa123`

Segera ganti password akun produksi.
