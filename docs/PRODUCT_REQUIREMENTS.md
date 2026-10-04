Saya memiliki aplikasi bernama **SainsMasemba**. Saya ingin Anda menganalisis, merapikan, dan mengembangkan aplikasi existing ini menjadi **platform ujian/ulangan berbasis PWA yang mobile-first, ringan, aman, dan nyaman digunakan melalui HP siswa**.

PENTING:
SainsMasemba BUKAN LMS.

Jangan menambahkan:
- materi pembelajaran,
- course,
- pertemuan,
- modul,
- progres belajar,
- diskusi pembelajaran,
- fitur LMS,
- fitur e-learning umum.

Aplikasi ini murni digunakan untuk:
- ulangan harian,
- kuis,
- asesmen,
- ujian sekolah,
- tryout,
- pengelolaan bank soal,
- pengelolaan peserta,
- pengerjaan ujian,
- penyimpanan jawaban,
- penilaian,
- dan hasil ujian.

Aplikasi LMS lain yang mungkin terdapat dalam referensi/source hanya digunakan sebagai contoh implementasi **PWA/mobile experience**, bukan sebagai acuan fitur SainsMasemba.

---

# 1. TUJUAN UTAMA

Redesign dan refactor SainsMasemba agar menjadi:

**Modern Mobile Exam PWA**

dengan karakter:

- mobile-first,
- installable PWA,
- cepat dibuka di HP,
- nyaman digunakan dengan layar kecil,
- online-first,
- tetap toleran terhadap koneksi internet tidak stabil,
- tidak membutuhkan storage lokal yang besar,
- ringan saat ratusan siswa ujian,
- mudah dikelola oleh sekolah,
- backend sederhana menggunakan ekosistem Google.

Target penggunaan utama:

**HP Android siswa melalui PWA yang telah di-install.**

Desktop tetap harus responsive, terutama untuk dashboard admin/guru, tetapi prioritas UX siswa adalah smartphone.

---

# 2. TEKNOLOGI BACKEND YANG DIINGINKAN

Arsitektur lama menggunakan:

- Neon PostgreSQL
- Vercel Blob

Saya ingin menggantinya menjadi:

**Database**
→ Google Sheets

**Backend/API**
→ Google Apps Script Web App

**File storage**
→ Google Drive

**Frontend**
→ pertahankan framework existing jika memungkinkan.

Jangan melakukan rewrite framework tanpa alasan kuat.

Arsitektur target:

SainsMasemba PWA
        |
        v
Frontend Application
        |
        v
ExamApi / API abstraction layer
        |
        v
Google Apps Script Web App
        |
        +---------- Google Sheets
        |           database online
        |
        +---------- Google Drive
                    image/file storage

Untuk browser/device:

PWA
 |
 +-- Memory
 |
 +-- IndexedDB kecil
 |   hanya data ujian yang diperlukan
 |
 +-- Service Worker / Cache Storage
     static application assets

---

# 3. PRINSIP ARSITEKTUR

Jangan menghubungkan komponen UI langsung ke Google Sheets atau Google Drive.

Gunakan abstraction seperti:

ExamApi

dan storage interface seperti:

FileStorage

Tujuannya agar backend dapat diganti di masa depan tanpa harus mengubah seluruh frontend.

Contoh konsep:

interface ExamApi {
  getAvailableExams()
  startExam()
  getQuestionBatch()
  saveAnswers()
  submitExam()
  getExamResult()
}

Untuk file:

interface FileStorage {
  upload()
  get()
  delete()
}

Implementasi sekarang:

GoogleAppsScriptExamApi
GoogleDriveStorage

Tetapi struktur harus memungkinkan suatu saat diganti menjadi:

PostgreSQL
Firebase
Supabase
Cloudflare R2
S3
atau backend lainnya.

---

# 4. MODEL UJIAN YANG DIPILIH

JANGAN menggunakan model:

download seluruh ujian → full offline → submit satu kali di akhir.

JANGAN pula menggunakan model:

setiap membuka satu soal → request API.

Gunakan pendekatan:

# ONLINE-FIRST + OFFLINE-TOLERANT

Strateginya:

1. siswa masuk ujian,
2. backend memvalidasi siswa,
3. aplikasi mengambil konfigurasi ujian,
4. aplikasi mengambil batch awal soal,
5. ujian dimulai,
6. soal berikutnya diprefetch di background,
7. jawaban langsung disimpan di memory,
8. backup jawaban kecil disimpan ke IndexedDB,
9. jawaban disinkron secara batch ke server,
10. jika internet mati, siswa masih dapat mengerjakan soal yang sudah tersedia,
11. ketika koneksi kembali, jawaban otomatis disinkronkan,
12. final submit dikirim ke server,
13. backend melakukan validasi dan penilaian.

---

# 5. QUESTION PREFETCHING

Jangan download semua soal jika tidak diperlukan.

Gunakan batch/prefetch.

Contoh:

ujian memiliki 50 soal.

Saat mulai:

download soal 1–10.

Ketika siswa mendekati soal 7:

prefetch soal 11–20.

Ketika siswa mendekati soal 17:

prefetch soal 21–30.

Dan seterusnya.

Ukuran batch dapat configurable, misalnya:

10–15 soal.

Tujuannya:

- startup lebih cepat,
- penggunaan storage kecil,
- request tidak terlalu banyak,
- pengalaman pindah soal tetap terasa instan.

Implementasikan loading state yang halus jika batch berikutnya belum selesai.

---

# 6. PENYIMPANAN LOKAL

IndexedDB tetap digunakan tetapi JANGAN digunakan sebagai database utama.

Gunakan IndexedDB hanya untuk menyimpan data minimal seperti:

attemptId
examId
currentQuestion
answers
flaggedQuestions
lastSyncRevision
lastSyncTimestamp
question batch yang sedang aktif jika diperlukan

Contoh:

{
  "attemptId": "ATT-X8JK29",
  "examId": "UH-FISIKA-01",
  "answers": {
    "Q001": "B",
    "Q002": "D",
    "Q003": "A"
  },
  "flagged": ["Q002"],
  "revision": 8
}

Jawaban pilihan ganda sangat kecil sehingga penggunaan storage tetap minimal.

Gunakan:

Memory
↓
IndexedDB
↓
Server

sebagai tiga lapisan penyimpanan.

---

# 7. ANTISIPASI STORAGE HP PENUH

Storage HP siswa dapat penuh.

Jangan menganggap IndexedDB selalu berhasil.

Sebelum ujian:

gunakan StorageManager jika tersedia:

navigator.storage.estimate()

Lakukan preflight check.

Periksa:

- IndexedDB dapat dibuka,
- storage dapat ditulis,
- kapasitas cukup,
- browser mendukung fitur minimum,
- aplikasi siap digunakan.

Jika memungkinkan gunakan:

navigator.storage.persist()

tetapi jangan bergantung sepenuhnya pada persistent storage karena browser dapat menolak permintaan tersebut.

Setiap operasi IndexedDB harus memakai try/catch.

Jika terjadi:

QuotaExceededError

jangan menghentikan ujian secara langsung.

Fallback:

Memory
↓
sync server jika internet tersedia.

Karena data lokal sangat kecil, masalah storage seharusnya jarang terjadi.

---

# 8. AUTOSAVE JAWABAN

Jangan membuat request setiap kali siswa mengklik jawaban.

Gunakan batch autosave.

Contoh kondisi sync:

- setiap 15–30 detik,
- atau setelah 3–5 jawaban berubah,
- atau ketika siswa berpindah section,
- atau ketika aplikasi masuk background,
- atau ketika koneksi kembali online,
- atau ketika siswa melakukan final submit.

Contoh payload:

{
  "attemptId": "ATT-X8JK29",
  "revision": 12,
  "answers": {
    "Q001": "B",
    "Q002": "D",
    "Q003": "A",
    "Q004": "C"
  }
}

Gunakan revision number untuk menghindari overwrite oleh data lama.

Backend harus menentukan versi terbaru.

---

# 9. FINAL SUBMISSION

Final submission harus idempotent.

Gunakan:

attemptId
submissionId
revision

Contoh:

{
  "attemptId": "ATT-X8JK29",
  "submissionId": "SUB-98DK21",
  "revision": 17,
  "answers": {...}
}

Jika request submit terkirim dua kali akibat jaringan buruk, server tidak boleh membuat submission duplikat.

Server cukup mengembalikan:

submission already accepted

atau status submission yang sama.

Jangan menghapus local backup sampai server memberikan acknowledgement bahwa submission berhasil diterima.

---

# 10. TIMER UJIAN

Jangan mempercayai jam HP sebagai sumber waktu utama.

Saat ujian dimulai backend memberikan:

serverTime
startedAt
expiresAt

Contoh:

{
  "serverTime": "...",
  "startedAt": "...",
  "expiresAt": "..."
}

Frontend menampilkan countdown berdasarkan data server.

Jika internet tersedia, lakukan time synchronization secara periodik.

Manipulasi jam perangkat tidak boleh memperpanjang durasi ujian.

Server harus tetap memvalidasi waktu ketika menerima submission.

---

# 11. ATTEMPT SYSTEM

Jangan menjadikan studentId sebagai satu-satunya identitas pengerjaan.

Setiap sesi ujian harus mempunyai:

attemptId unik.

Contoh:

ATT-UH01-20260015-K83XM2

Attempt menyimpan minimal:

attemptId
examId
studentId
startedAt
expiresAt
status
questionSetVersion
questionOrder
optionOrder
lastSyncAt
revision
submittedAt

Jika aplikasi reload/crash, aplikasi harus dapat melanjutkan attempt yang masih aktif.

---

# 12. KEAMANAN SOAL

SANGAT PENTING:

Jangan pernah mengirim kunci jawaban ke frontend.

Frontend hanya menerima:

questionId
question
options
image jika ada
metadata UI yang diperlukan

JANGAN menerima:

correctAnswer
scoreKey
answerKey

Kunci jawaban hanya berada pada backend.

Penilaian dilakukan di server.

---

# 13. RANDOMISASI

Support:

- random order soal,
- random order pilihan jawaban,
- question pool,
- beberapa paket soal.

Randomisasi ditentukan oleh backend.

Backend menyimpan:

questionOrder
optionOrder

per attempt.

Jangan mengandalkan randomisasi frontend saja.

---

# 14. GOOGLE SHEETS

Gunakan Google Sheets sebagai database online.

Jangan melakukan operasi cell-by-cell jika dapat dihindari.

Gunakan batch read dan batch write.

Apps Script harus:

- membaca data sebanyak mungkin dalam satu operasi,
- memproses di memory,
- menulis kembali secara batch.

Pisahkan logical tables/sheets.

Contoh:

USERS

userId
name
class
username
role
status

EXAMS

examId
title
subject
startTime
endTime
duration
questionCount
status
randomizeQuestion
randomizeOption
resultVisibility

QUESTIONS

questionId
examId atau questionBankId
questionText
optionA
optionB
optionC
optionD
imageFileId
questionType
difficulty
status

ANSWER_KEYS

questionId
correctAnswer
score

ATTEMPTS

attemptId
examId
studentId
startedAt
expiresAt
lastSyncAt
revision
status
submittedAt

SUBMISSIONS

submissionId
attemptId
studentId
examId
answersJson
score
submittedAt
status

Sesuaikan bila architecture existing sudah lebih baik.

Jangan menyimpan satu jawaban = satu row kecuali memang diperlukan.

Untuk efisiensi, jawaban satu attempt dapat disimpan sebagai JSON.

---

# 15. GOOGLE DRIVE

Google Drive menggantikan Vercel Blob.

Gunakan untuk:

- gambar soal,
- gambar diagram,
- file pendukung soal jika benar-benar diperlukan.

Tidak ada storage materi pembelajaran karena SainsMasemba bukan LMS.

Database hanya menyimpan:

fileId

bukan URL Drive hard-coded.

Contoh:

imageFileId: "1AbcXYZ..."

Jangan menyimpan:

drive.google.com/file/d/.../view

sebagai basis arsitektur.

Buat storage abstraction.

---

# 16. OPTIMASI GAMBAR

Gambar dari guru mungkin sangat besar.

Jangan langsung memberikan gambar original 3–10 MB kepada siswa.

Buat pipeline agar gambar soal idealnya dikompres.

Gunakan:

WebP atau format modern yang kompatibel.

Target umum:

sekitar 100–300 KB untuk gambar soal biasa,

tetapi kualitas tetap harus cukup untuk:

- grafik,
- diagram,
- teks kecil,
- rumus,
- gambar sains.

Jangan melakukan compression agresif yang membuat pertanyaan tidak terbaca.

---

# 17. GOOGLE DRIVE BUKAN CDN UTAMA

Jangan membuat browser terus meminta file ke Drive setiap kali soal berpindah.

Gunakan browser caching / service worker caching seperlunya.

Saat gambar telah diambil:

cache agar ketika siswa kembali ke soal gambar tidak perlu di-download ulang.

Drive berfungsi sebagai file repository.

---

# 18. GOOGLE APPS SCRIPT API

Apps Script menjadi API layer.

Gunakan JSON API yang jelas.

Minimal endpoint/logical action:

AUTH / SESSION

login
logout
getSession

EXAM

getAvailableExams
validateExamAccess
startExam
getExamConfig
getQuestionsBatch
resumeAttempt
saveAnswers
submitExam
getResult

ADMIN

createExam
updateExam
deleteExam
publishExam
uploadQuestionImage
createQuestion
updateQuestion
deleteQuestion
importQuestions
getExamParticipants
getExamMonitoring
getExamResults

Nama endpoint boleh disesuaikan dengan architecture Apps Script, tetapi responsibilities harus jelas.

---

# 19. CACHE APPS SCRIPT

Gunakan CacheService untuk data yang sering dibaca tetapi jarang berubah, misalnya:

exam config
question metadata
question batch tertentu

Jangan menganggap cache sebagai persistent database.

Google Sheets tetap source of truth.

Invalidasi cache jika admin mengubah/publish ujian.

---

# 20. LOCKING

Gunakan LockService hanya ketika benar-benar perlu untuk mencegah race condition, terutama:

- final submit,
- assignment attempt,
- update data yang sensitif terhadap concurrent write.

Jangan mengunci seluruh proses terlalu lama.

Critical section harus kecil.

---

# 21. DESAIN VISUAL

Saya tidak ingin menggunakan neumorphism sebagai gaya utama.

Gunakan:

# Modern Flat SaaS UI
+
# Bento Dashboard
+
# Blue / Teal SainsMasemba

Visual direction:

clean
minimal
modern
native-like
mobile-first
professional
friendly untuk siswa
tidak terlalu corporate
tidak terlalu childish

Gunakan warna utama dari identitas SainsMasemba.

Suggested palette:

Primary Blue
#0B5DB4

Secondary Teal
#11B8B8

Primary Dark
#084985

Accent Amber
#F59E0B

Background
#F6F8FB

Surface
#FFFFFF

Border
#E2E8F0

Primary Text
#0F172A

Secondary Text
#64748B

Success
#16A34A

Danger
#DC2626

Gunakan gradient hanya sebagai aksen:

linear-gradient(135deg, #0B5DB4, #11B8B8)

Jangan menggunakan terlalu banyak warna card.

Card sebaiknya tetap putih.

Warna digunakan pada:

- icons,
- badge,
- active states,
- charts,
- CTA,
- status.

---

# 22. CARD DESIGN

Jangan menggunakan heavy neumorphism seperti:

8px 8px 16px gray
-8px -8px 16px white

Gunakan:

background: #FFFFFF
border: 1px solid #E2E8F0
border-radius: sekitar 14–18px
shadow lembut

Contoh:

box-shadow:
0 1px 2px rgba(15,23,42,.04),
0 4px 12px rgba(15,23,42,.05)

Glassmorphism boleh digunakan sangat terbatas untuk:

- login,
- special overlay,
- install PWA prompt,

tetapi jangan dipakai untuk seluruh dashboard.

---

# 23. TYPOGRAPHY

Gunakan Inter jika existing project sudah menggunakannya.

Prioritas:

readability
angka jelas
teks soal nyaman dibaca lama
tidak terlalu dekoratif

Hierarchy harus konsisten.

---

# 24. MOBILE TOUCH TARGET

Gunakan ukuran minimum yang nyaman disentuh.

Guideline:

button height:
44–48px minimum

input:
48px

icon button:
40–44px

page horizontal padding:
sekitar 16px

card padding:
16px

gap:
12–16px

border radius:
14–18px

Jangan mengecilkan kontrol hanya demi terlihat compact.

---

# 25. STUDENT HOME

Siswa tidak membutuhkan dashboard SaaS yang rumit.

Beranda siswa harus sederhana.

Contoh struktur:

Header
- logo/nama SainsMasemba
- notification jika diperlukan
- profile avatar

Greeting

Ujian tersedia

Card:

Ulangan Harian Fisika
Kelas XI
40 soal
45 menit

Status:

Belum dimulai

CTA:

Mulai Ujian

Kemudian section lain jika relevan:

- Ujian sedang berjalan
- Ujian mendatang
- Riwayat ujian

Gunakan Bento layout sederhana.

Mobile:

1 kolom utama
dengan beberapa card 2 kolom hanya untuk statistik kecil.

---

# 26. PRE-EXAM SCREEN

Sebelum ujian dimulai tampilkan informasi:

Nama ujian
Mata pelajaran
Jumlah soal
Durasi
Waktu mulai
Waktu selesai
aturan ujian

Lakukan:

# Exam Readiness Check

Tampilkan:

✓ akun terverifikasi
✓ koneksi tersedia
✓ storage browser siap
✓ local database siap
✓ konfigurasi ujian siap
✓ soal awal siap

Timer belum dimulai.

Timer BARU dimulai setelah attempt berhasil dibuat dan batch awal soal berhasil disiapkan.

Jika gagal:

jangan mulai timer.

---

# 27. EXAM SCREEN

Mobile exam screen harus sangat fokus.

Contoh hierarchy:

Topbar sticky

Nama ujian
Timer

Status save kecil:

✓ Tersimpan
↻ Menyimpan...
⚠ Offline

Kemudian:

Soal 12 dari 40

question body

gambar jika ada

options besar dan touch-friendly

A
B
C
D

button:

Tandai Ragu-ragu

navigation:

Sebelumnya
Berikutnya

dan akses:

Daftar nomor soal

---

# 28. QUESTION NAVIGATOR

Buat bottom sheet atau modal nomor soal.

Gunakan status visual:

answered
unanswered
flagged/current

Misalnya:

biru = sudah dijawab
putih = belum
amber = ragu
outline tebal = soal sekarang

Jangan hanya mengandalkan warna.

Gunakan icon/border/shape supaya accessible.

---

# 29. ONLINE/OFFLINE STATUS

Siswa harus tahu apakah jawabannya tersimpan.

Contoh state:

ONLINE + SYNCED

✓ Semua jawaban tersimpan

SYNCING

↻ Menyimpan jawaban...

OFFLINE

⚠ Tidak ada internet
Jawaban disimpan sementara

RECONNECTED

↻ Menyinkronkan...

SYNC SUCCESS

✓ Semua jawaban berhasil disimpan

Jangan membuat pesan yang menakutkan siswa.

---

# 30. SUBMIT FLOW

Ketika siswa klik:

Selesai Ujian

jangan langsung submit.

Tampilkan review:

Terjawab: 37
Belum dijawab: 2
Ragu-ragu: 1

CTA:

Kembali ke ujian

Kirim Jawaban

Jika ada soal kosong, berikan informasi jelas tetapi jangan mengubah jawaban secara otomatis.

Setelah submit:

disable perubahan jawaban.

Tampilkan progress:

Mengirim jawaban...

Setelah server acknowledge:

Ujian berhasil dikumpulkan.

---

# 31. RESULT SCREEN

Result visibility harus configurable oleh admin.

Mode:

immediate
after_exam_closed
manual_publish
hidden

Jika hasil boleh terlihat:

score
jumlah benar
jumlah salah
jumlah kosong

Jangan menampilkan kunci jawaban jika admin tidak mengizinkan.

---

# 32. ADMIN DASHBOARD

Admin lebih sering memakai desktop tetapi tetap responsive.

Dashboard menggunakan:

Modern Flat SaaS UI + Bento.

Informasi utama:

Ujian aktif
Ujian mendatang
Jumlah peserta
Peserta sedang ujian
Sudah submit
Belum submit

Quick actions:

Buat Ujian
Bank Soal
Peserta
Hasil
Monitoring

Jangan menggunakan banyak card berwarna-warni.

Card putih dengan accent icon.

---

# 33. EXAM MANAGEMENT

Admin harus dapat:

buat ujian
edit ujian
publish
unpublish
duplicate
hapus

Setting ujian:

title
subject
class
startTime
endTime
duration
questionCount
question pool
randomize question
randomize option
token jika diperlukan
result visibility
attempt policy

---

# 34. QUESTION BANK

Support:

multiple choice minimal.

Jika source existing sudah support question type lain, pertahankan.

Question editor:

question text
A
B
C
D
correct answer
score
image
difficulty
tag/category

Kunci jawaban hanya dapat diakses admin.

---

# 35. IMPORT SOAL

Jika existing memiliki import Excel/CSV, pertahankan atau rapikan.

Validasi sebelum import.

Tampilkan:

valid questions
invalid rows
errors

Jangan melakukan partial import tanpa informasi yang jelas.

---

# 36. MONITORING UJIAN

Admin dapat melihat:

jumlah peserta
belum mulai
sedang mengerjakan
offline/recent sync jika memungkinkan
submitted

Data tidak harus real-time setiap detik.

Gunakan polling interval yang masuk akal atau refresh manual.

Jangan membebani Apps Script.

---

# 37. PERFORMANCE

Prioritas sangat tinggi.

Jangan membuat:

N+1 query
cell-by-cell Google Sheets operations
request per question
request per answer
request gambar berulang

Gunakan:

batching
prefetch
cache
memoization frontend jika relevan
lazy loading
image optimization

Target:

navigasi soal setelah prefetch harus terasa instant.

---

# 38. PWA

Pastikan:

manifest benar
icons tersedia
display standalone
theme color sesuai branding
service worker berfungsi
installable
safe area compatible

Gunakan:

env(safe-area-inset-top)
env(safe-area-inset-bottom)

untuk HP yang mempunyai notch/home indicator.

Jangan cache API exam response dengan strategi yang menyebabkan data stale secara berbahaya.

Pisahkan caching static asset dan exam data.

---

# 39. RESPONSIVE DESIGN

Mobile:

prioritas utama.

Tablet:

layout dapat melebar.

Desktop admin:

sidebar + content.

Student exam desktop:

tetap fokus ke soal, jangan berubah menjadi dashboard kompleks.

---

# 40. SECURITY PRINCIPLES

Jangan mempercayai frontend.

Server harus memvalidasi:

attempt
student
exam status
exam time
submission status
question IDs
answer format

Jangan mengandalkan hidden input.

Jangan mengirim answer key.

Jangan menyimpan secret Apps Script di frontend.

Jangan menganggap Drive file ID sebagai security mechanism.

---

# 41. AUTHENTICATION

Pertahankan mekanisme auth existing jika aman dan bekerja.

Jika perlu refactor:

gunakan session/token yang aman.

Jangan menyimpan password plaintext.

Role minimal:

admin
student

Jika source existing memiliki teacher/operator dan memang diperlukan, pertahankan secara proporsional.

---

# 42. ERROR HANDLING

Buat error states yang human-readable.

Contoh:

Tidak dapat memuat soal berikutnya.

[ Coba Lagi ]

Jangan hanya:

Error 500

Jika save gagal tetapi local backup ada:

Jawaban tersimpan sementara di perangkat.

Jika submit gagal:

Jangan menandai ujian sebagai selesai sampai server acknowledge.

---

# 43. NETWORK RETRY

Gunakan retry dengan exponential backoff untuk request tertentu.

Tetapi jangan retry final submission tanpa idempotency key.

Batasi jumlah retry.

Ketika offline:

jangan spam request.

Tunggu online event / interval yang wajar.

---

# 44. MIGRASI DARI SISTEM LAMA

Source existing sebelumnya menggunakan:

Neon PostgreSQL
Vercel Blob

Analisis terlebih dahulu:

- schema existing,
- API existing,
- auth,
- file upload,
- question management,
- exam logic,
- result logic,
- PWA config,
- shared UI.

Jangan membuang fitur yang masih relevan.

Buat mapping:

Neon → Google Sheets
Vercel Blob → Google Drive

Pisahkan migration layer dari UI.

---

# 45. JANGAN LANGSUNG MENULIS ULANG SEMUA

Sebelum implementasi:

1. audit project existing,
2. identifikasi framework,
3. identifikasi routes,
4. identifikasi components,
5. identifikasi data model,
6. identifikasi API,
7. identifikasi authentication,
8. identifikasi PWA configuration,
9. identifikasi storage implementation,
10. identifikasi reusable UI.

Setelah itu buat plan refactor.

Prioritaskan reuse.

---

# 46. DESIGN SYSTEM

Buat centralized design tokens.

Contoh:

--primary
--primary-hover
--secondary
--background
--surface
--surface-soft
--border
--text-primary
--text-secondary
--success
--warning
--danger

Jangan hard-code warna di banyak component.

Implement dark mode hanya jika existing sudah mendukung dan tidak memperumit aplikasi.

Dark mode bukan prioritas utama untuk ujian.

---

# 47. ICONS

Gunakan satu icon library existing jika tersedia, misalnya Lucide.

Jangan mencampur beberapa style icon.

Icon bersifat outline modern dan sederhana.

---

# 48. ACCESSIBILITY

Pastikan:

contrast cukup
font tidak terlalu kecil
touch target besar
focus state jelas
screen reader label pada icon button
status tidak hanya dibedakan melalui warna
keyboard navigation desktop tetap berfungsi

---

# 49. DATA INTEGRITY

Server menjadi source of truth.

Local data hanya:

cache / temporary working state.

Gunakan:

attemptId
revision
submissionId

untuk menjaga konsistensi.

Setelah final submit berhasil:

attempt status = SUBMITTED

dan tidak dapat dimodifikasi lagi kecuali admin memiliki workflow khusus reset/reopen.

---

# 50. TARGET EXPERIENCE

Ketika siswa menggunakan aplikasi:

Install SainsMasemba
        ↓
Login
        ↓
Beranda
        ↓
Pilih Ulangan
        ↓
Preflight Check
        ↓
Mulai
        ↓
Batch soal pertama sudah tersedia
        ↓
Kerjakan dengan lancar
        ↓
Jawaban tersimpan otomatis
        ↓
Internet putus sementara?
Tidak masalah untuk soal yang tersedia
        ↓
Internet kembali
        ↓
Auto-sync
        ↓
Review
        ↓
Submit
        ↓
Server acknowledge
        ↓
Selesai

---

# 51. UX PRINCIPLE TERPENTING

Aplikasi harus terasa seperti:

**native exam app**

bukan:

website desktop yang diperkecil menjadi mobile.

Kurangi:

- header besar,
- sidebar pada mobile,
- decorative elements,
- heavy animations,
- blur berlebihan,
- visual effects yang tidak membantu ujian.

Utamakan:

- soal,
- timer,
- jawaban,
- status tersimpan,
- navigasi,
- readability.

---

# 52. ANIMATION

Gunakan animation sangat subtle:

150–250ms.

Contoh:

card transition
bottom sheet
button press
answer selection

Jangan menggunakan animation yang mengganggu konsentrasi siswa.

Respect:

prefers-reduced-motion.

---

# 53. LOGGING

Backend boleh menyimpan audit minimum:

attempt started
last sync
submitted
submission timestamp

Jika diperlukan:

device/session metadata minimum.

Jangan mengumpulkan data berlebihan yang tidak dibutuhkan.

---

# 54. ACCEPTANCE CRITERIA

Aplikasi dianggap berhasil jika:

1. PWA dapat di-install pada HP.
2. siswa dapat login.
3. siswa melihat ujian yang tersedia.
4. siswa dapat memulai attempt.
5. timer berdasarkan server.
6. batch soal awal dapat dimuat.
7. soal berikutnya diprefetch.
8. perpindahan antar soal terasa cepat.
9. jawaban tersimpan lokal dalam ukuran kecil.
10. jawaban autosync secara batch.
11. internet terputus sementara tidak langsung menghilangkan jawaban.
12. ketika koneksi kembali data tersinkron.
13. final submit bersifat idempotent.
14. answer key tidak pernah dikirim ke client.
15. nilai dihitung backend.
16. file soal dapat disimpan di Google Drive.
17. file ID digunakan sebagai reference.
18. Google Sheets digunakan sebagai database.
19. Apps Script menggunakan batch operations.
20. UI mobile mengikuti desain Modern Flat SaaS + Bento + Blue/Teal SainsMasemba.
21. aplikasi tidak berisi fitur LMS yang tidak relevan.
22. aplikasi responsive.
23. admin dapat mengelola ujian dan soal.
24. admin dapat melihat hasil.
25. source code modular dan maintainable.

---

# 55. OUTPUT YANG SAYA INGINKAN DARI ANDA

Kerjakan dalam urutan berikut:

### STEP 1 — Audit
Analisis codebase existing secara menyeluruh.

Tampilkan:

- technology stack,
- folder structure,
- architecture,
- existing database integration,
- Vercel Blob usage,
- authentication,
- routing,
- PWA setup,
- exam workflow,
- UI system,
- technical debt,
- komponen yang dapat dipertahankan.

### STEP 2 — Proposed Architecture
Tampilkan architecture target:

Frontend
Apps Script
Google Sheets
Google Drive
IndexedDB
Service Worker

dan jelaskan data flow.

### STEP 3 — Migration Plan
Buat migration plan dari:

Neon PostgreSQL → Google Sheets

dan:

Vercel Blob → Google Drive.

### STEP 4 — Data Model
Definisikan struktur Google Sheets yang diperlukan.

### STEP 5 — API
Definisikan Apps Script API contract.

Request/response harus jelas.

### STEP 6 — Exam State Machine
Definisikan status seperti:

AVAILABLE
PREPARING
IN_PROGRESS
OFFLINE
SYNCING
SUBMITTING
SUBMITTED
EXPIRED

Gunakan state machine sederhana agar flow tidak kacau.

### STEP 7 — UI/UX
Redesign:

Login
Student Home
Pre-exam
Exam
Question navigator
Submit review
Result
Admin Dashboard
Exam Management
Question Bank
Results

### STEP 8 — Implementation
Refactor code secara bertahap.

Jangan merusak fitur existing yang masih relevan.

### STEP 9 — Testing
Test:

mobile viewport
PWA install
reload
offline
reconnect
slow connection
duplicate submit
storage failure
expired exam
server failure
image loading
hundreds of answers
browser refresh

### STEP 10 — Final Review
Periksa:

performance
security
accessibility
mobile UX
Apps Script efficiency
Google Sheets efficiency
Drive usage
PWA behavior

---

# 56. HAL YANG HARUS DIHINDARI

Jangan:

- mengubah SainsMasemba menjadi LMS,
- menambahkan course/materi/pertemuan,
- membuat full neumorphism,
- membuat seluruh UI glassmorphism,
- menyimpan kunci jawaban di frontend,
- membaca Google Sheet langsung dari browser,
- membuat request API per jawaban,
- membuat request API per perpindahan soal,
- menyimpan gambar original berukuran sangat besar,
- menggunakan Google Drive URL sebagai database identifier,
- menyimpan seluruh state hanya di localStorage,
- mengandalkan jam HP untuk timer,
- menghapus jawaban lokal sebelum server acknowledge,
- menganggap IndexedDB selalu tersedia,
- menulis Google Sheets cell-by-cell,
- membuat UI desktop lalu sekadar mengecilkannya untuk HP.

---

# 57. PRIORITAS JIKA TERJADI TRADE-OFF

Gunakan urutan prioritas:

1. integritas jawaban siswa
2. stabilitas ujian
3. keamanan
4. performa pada HP
5. koneksi internet tidak stabil
6. kemudahan penggunaan
7. kemudahan maintenance
8. visual
9. animasi

Visual tidak boleh mengorbankan reliability.

---

# FINAL DIRECTION

Bangun SainsMasemba sebagai:

**Mobile-first PWA Exam Platform**

dengan arsitektur:

Frontend PWA
+
Google Apps Script API
+
Google Sheets Database
+
Google Drive File Storage
+
IndexedDB Minimal Local Backup
+
Online-first / Offline-tolerant Exam Engine

dan desain:

**Modern Flat SaaS UI
+ Bento Dashboard
+ SainsMasemba Blue/Teal
+ Native-like Mobile Exam Experience**

Sebelum melakukan perubahan besar, pahami codebase existing terlebih dahulu.

Jangan sekadar membuat mockup.

Saya ingin hasil akhir berupa aplikasi yang benar-benar dapat digunakan untuk ujian sekolah melalui HP dengan koneksi yang tidak selalu sempurna dan tetap cukup ringan saat banyak siswa mengakses secara bersamaan.