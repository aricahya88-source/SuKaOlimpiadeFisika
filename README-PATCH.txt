PATCH FIX TAMPILAN SAINSMASemba v2.1.4

Penyebab:
Patch sebelumnya mengganti struktur AdminShell/StudentShell dengan class yang tidak cocok dengan globals.css lama.
Akibatnya sidebar/header/navigation tampil seperti HTML tanpa styling.

File yang harus diganti:
1. src/components/admin-shell.tsx
2. src/components/student-shell.tsx
3. src/components/developer-page.tsx
4. src/app/globals.css

Patch ini:
- mengembalikan struktur class admin-app/admin-sidebar/admin-main/admin-topbar/admin-content
- mengembalikan student-app/mobile-header/bottom-nav
- tetap menambahkan menu Pengembang
- mempertahankan menu Peserta, Monitoring, dan Hasil
- memperbaiki CSS halaman Pengembang agar memakai variable design system yang memang tersedia
- membuat bottom navigation siswa 5 kolom

Setelah replace:
1. git add .
2. git commit -m "fix: restore SainsMasemba shell styling"
3. git push origin main
4. tunggu Vercel redeploy

Tidak perlu mengubah Apps Script, Spreadsheet, Google Drive, atau environment variables untuk fix tampilan ini.
