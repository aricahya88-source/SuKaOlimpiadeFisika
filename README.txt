FIX Syntax Error Exam.gs

Error:
Identifier 'points' has already been declared (line 38)

Penyebab:
Di function scoreQuestion_(), blok MATCHING memakai `var points`, sementara bagian sesudahnya memakai `let points`.
Karena `var` memiliki function scope, Apps Script menganggap nama `points` dideklarasikan dua kali dalam function yang sama.

Perbaikan:
`var points` khusus MATCHING diganti menjadi `var matchingPoints`.

Cara pasang:
1. Buka Google Apps Script SainsMasemba.
2. Buka file Exam.gs.
3. Ganti seluruh isi Exam.gs dengan Exam.gs dari patch ini.
4. Save.
5. Jalankan repairSainsMasemba() jika belum dijalankan setelah update MATCHING.
6. Deploy > Manage deployments > Edit > New version > Deploy.

URL /exec tetap sama.
