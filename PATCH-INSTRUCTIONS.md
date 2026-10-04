# SainsMasemba v2.2.0 — Exam Navigator + Image Viewer

Patch frontend saja.

## Perubahan
1. Tombol navigator melayang di bawah layar ujian dihapus. Navigator nomor soal tetap dapat dibuka dari tombol kotak/grid pada topbar.
2. Image lightbox dirender melalui portal ke `document.body`, sehingga toolbar tidak tertutup topbar/footer ujian.
3. Tombol Zoom Out, Reset, Zoom In, dan Close selalu berada di atas gambar.
4. Zoom 100%–400%.
5. Setelah gambar diperbesar, gambar dapat digeser kanan/kiri/atas/bawah dengan mouse atau sentuhan.
6. Double-click/double-tap desktop-style pada gambar: 100% ↔ 200% (dukungan tap ganda bergantung browser).

## File yang diganti
- `src/app/student/exam/[examId]/page.tsx`
- `src/components/math-html.tsx`
- `src/app/globals.css`

## Instalasi
Replace tiga file di atas, kemudian commit/push ke GitHub. Vercel akan redeploy.

Tidak perlu mengubah Apps Script, menjalankan setup, atau repair database.

## Screenshot
PWA/browser tidak mempunyai izin sistem untuk memblokir screenshot OS secara absolut. Proteksi clipboard/fullscreen/watermark tetap berlaku. Untuk blok screenshot yang sebenarnya pada Android diperlukan aplikasi native dengan `FLAG_SECURE`; untuk mengunci siswa tetap di aplikasi diperlukan Lock Task/Kiosk Mode pada perangkat yang dikelola.
