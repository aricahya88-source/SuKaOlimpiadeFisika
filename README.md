# Patch Netlify dependency

1. Ganti `package.json` proyek dengan file `package.json` dari patch ini.
2. Hapus `package-lock.json` lama dari repository GitHub.
3. Commit dan push perubahan.
4. Jalankan redeploy di Netlify.

Lockfile lama mengunci `@types/node@22.20.5`, sedangkan versi tersebut tidak tersedia pada registry yang digunakan Netlify. Setelah lockfile dihapus, Netlify akan membuat resolusi dependensi baru berdasarkan `package.json`.
