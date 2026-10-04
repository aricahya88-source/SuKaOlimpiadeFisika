/**
 * SAINSMAMBA STORAGE / SETUP CONFIG
 *
 * ISI ID DI BAWAH INI, lalu jalankan setupSainsMasemba() dari editor Apps Script.
 * Spreadsheet boleh kosong. Folder Drive sebaiknya folder khusus gambar soal.
 *
 * Jangan commit password produksi ke repository GitHub publik.
 */
var SM_STORAGE_CONFIG = {
  SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE',
  DRIVE_FOLDER_ID: 'PASTE_DRIVE_FOLDER_ID_HERE',

  // true = gambar soal yang diunggah dapat ditampilkan langsung melalui URL Drive.
  PUBLIC_QUESTION_IMAGES: true,

  // Akun Super Admin awal. Password hanya dipakai ketika akun belum ada.
  SUPER_ADMIN_USERNAME: 'superadmin',
  SUPER_ADMIN_PASSWORD: 'GANTI_PASSWORD_AWAL_MIN_8_KARAKTER',

  // Isi nilai ini hanya saat ingin reset password, lalu jalankan resetSuperAdminPassword().
  RESET_SUPER_ADMIN_PASSWORD: 'GANTI_PASSWORD_BARU_MIN_8_KARAKTER',

  // Opsional untuk pengujian. Sebaiknya false pada production.
  CREATE_DEMO_ACCOUNTS: false,
  CREATE_DEMO_EXAM: false
};
