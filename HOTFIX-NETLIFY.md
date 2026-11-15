# Hotfix TypeScript Netlify v4.1

Log yang diperbaiki: `src/app/student/exam/[examId]/page.tsx:343:11`, `Variable 'response' implicitly has type 'any'`.

**Jika sudah mengunggah v4:** salin **hanya** file `src/app/student/exam/[examId]/page.tsx` dari ZIP v4.1 ini ke lokasi yang sama di repo. File lain tetap. Commit, jalankan `npm run typecheck` dan `npm run build`, lalu deploy lagi.

Perubahan source persis:
```diff
-import { getExamApi, type Attempt, type ExamResult, type ExamSummary, type PreflightResult, type Question, type SaveStatus, type SaveAnswersResponse, type SubmitResponse } from '@/lib/api';
+import { getExamApi, type Attempt, type ExamResult, type ExamSummary, type PreflightResult, type Question, type SaveStatus, type SaveAnswersResponse, type SubmitResponse, type StartExamResponse, type ResumeAttemptResponse } from '@/lib/api';

-      let response;
+      let response: StartExamResponse | ResumeAttemptResponse;
```

Perubahan ini tidak mengubah fitur perlindungan jawaban maupun rumus nilai. Build penuh belum dapat diverifikasi secara lokal karena akses registry npm gagal.
