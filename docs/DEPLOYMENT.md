# Deployment GitHub + Vercel + Apps Script

## 1. GitHub

```bash
git init
git add .
git commit -m "Initial SainsMasemba Exam PWA"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Saran branch:

- `main` = production
- `dev` = development / preview Vercel

## 2. Vercel

1. Import repository GitHub.
2. Framework akan terdeteksi sebagai Next.js.
3. Tambahkan Environment Variables:

```text
NEXT_PUBLIC_API_MODE=apps-script
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
NEXT_PUBLIC_SCHOOL_NAME=Sains Masemba
```

4. Deploy.

Tidak diperlukan Neon, Prisma, atau Vercel Blob untuk arsitektur ini.

## 3. Apps Script

Backend tetap dideploy di Google Apps Script, bukan di Vercel. Ikuti `GOOGLE_APPS_SCRIPT_SETUP.md`.

## 4. Update aplikasi

Frontend:

```text
local -> git push -> GitHub -> Vercel auto deploy
```

Backend Apps Script:

```text
local apps-script/ -> clasp push -> Apps Script -> New deployment/version
```

Jika tidak memakai clasp, file `.gs` juga bisa ditempel ke editor Apps Script secara manual.

## 5. Development / Production terpisah

Sangat disarankan membuat dua project Apps Script:

- `SainsMasemba_DEV`
- `SainsMasemba_PROD`

Masing-masing memiliki Spreadsheet dan folder Drive sendiri. Gunakan URL Web App DEV di branch development dan URL PROD di production Vercel.
