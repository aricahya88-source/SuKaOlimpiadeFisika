# Build Validation

Validasi yang dijalankan pada paket ini sebelum ZIP dibuat:

- parser TypeScript/TSX terhadap seluruh `src`: lolos;
- parser JavaScript terhadap seluruh file Apps Script `.gs`: lolos;
- resolver import internal `@/` dan relative imports: tidak ada target yang hilang;
- JSON parse untuk `package.json`, `tsconfig.json`, PWA manifest dan `appsscript.json`: lolos;
- `scripts/verify.mjs`: lolos dan memeriksa tiga role, WYSIWYG/LaTeX, XLSX, reusable Bank Soal, `EXAM_QUESTIONS`, pemetaan ujian dan backend Apps Script;
- integritas ZIP diperiksa setelah packaging.

## Batasan environment pembuatan

`npm install` tidak selesai dalam batas waktu runtime pada environment pembuatan artifact, sehingga full `next build` tidak diklaim telah dijalankan di sini. Workflow `.github/workflows/quality.yml` tetap menjalankan dependency install, typecheck, verifier dan production build setelah repository dipush ke GitHub.

Sebelum production deploy, jalankan:

```bash
npm install
npm run typecheck
npm run verify
npm run build
```
