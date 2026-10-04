# Full Feature Parity — modul inti SainsMasemba

Versi ini mempertahankan tiga role (`super_admin`, `teacher`, `student`) dan mengembalikan kemampuan modul inti yang sebelumnya disederhanakan.

## Bank Soal

- Bank Soal berdiri sendiri; soal tidak dimiliki eksklusif oleh satu ujian.
- Ownership soal disimpan melalui `QUESTIONS.authorId`.
- Hubungan soal dan ujian disimpan di `EXAM_QUESTIONS (examId, questionId, orderNo)`.
- Satu soal dapat dipakai pada beberapa ujian.
- Guru hanya mengelola soal miliknya; Super Admin dapat mengelola seluruh bank soal.
- Kode soal unik, kode topik, kode kisi-kisi/blueprint, tag/topik, kesulitan, status dan bobot tersedia.
- Jenis soal: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`.
- Penilaian: `EXACT_MATCH`, `PARTIAL_NO_PENALTY`.
- Opsi A–E serta pembahasan rich text.

## WYSIWYG dan matematika

Editor mendukung:

- bold, italic, underline;
- H2/H3;
- ordered/unordered list;
- link;
- tabel;
- gambar;
- source HTML;
- undo/redo;
- LaTeX inline dan block;
- preview KaTeX.

Saat backend Apps Script aktif, gambar dari toolbar editor diunggah ke Google Drive dan URL hasil upload disisipkan ke HTML.

## Pengaturan Ujian

- Deskripsi rich text + LaTeX.
- Aturan ujian rich text + LaTeX.
- Guru pemilik (Super Admin).
- Mapel, kelas, mulai/selesai, durasi.
- Status DRAFT/SCHEDULED/OPEN/PAUSED/ENDED/ARCHIVED.
- Token opsional.
- Randomisasi soal dan opsi.
- Visibilitas hasil.
- Kebijakan attempt.
- Pemetaan Bank Soal dan pengurutan soal.
- Duplikasi ujian menyalin pemetaan, tidak menggandakan record Bank Soal.

## Import Excel lama

`public/templates/question-import-template.xlsx` berasal dari format SainsMasemba lama. Importer mengenali antara lain:

- `nama_tryout`
- `kode_soal`
- `jenis_soal`
- `sistem_penilaian`
- `bobot`
- `topik`
- `kode_topik`
- `kode_kisi_kisi`
- `tingkat_kesulitan`
- `status`
- `urutan_stimulus` / `urutan_soal`
- `stimulus_html`
- `pertanyaan_html`
- `opsi_a` ... `opsi_e`
- `kunci_jawaban`
- `pembahasan_html`

`stimulus_html` dan `pertanyaan_html` digabung seperti pada alur impor lama. Jika filter ujian dipilih, hasil impor otomatis dipetakan ke ujian tersebut. Jika tidak, `nama_tryout` dicocokkan dengan judul ujian; bila tidak ada kecocokan, soal tetap masuk Bank Soal tanpa pemetaan.

## Migrasi schema Google Sheets

`setupSainsMasemba()` bersifat upgrade-safe:

- menambah kolom baru tanpa menghapus data existing;
- membuat `EXAM_QUESTIONS` bila belum ada;
- mengisi `QUESTIONS.authorId` untuk data lama;
- memigrasikan `QUESTIONS.examId` legacy menjadi row `EXAM_QUESTIONS`;
- tetap mempertahankan field legacy sebagai referensi migrasi.
