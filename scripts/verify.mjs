import fs from 'node:fs';
import path from 'node:path';

const required = [
  'src/app/page.tsx', 'src/app/student/page.tsx', 'src/app/super-admin/page.tsx', 'src/app/teacher/page.tsx',
  'src/app/super-admin/users/page.tsx', 'src/components/admin-shell.tsx', 'src/components/exam-manager.tsx',
  'src/components/question-manager.tsx', 'src/components/rich-editor.tsx', 'src/components/math-html.tsx',
  'src/lib/api/apps-script-api.ts', 'src/lib/api/demo-api.ts', 'public/manifest.webmanifest', 'public/sw.js',
  'public/templates/question-import-template.xlsx', 'apps-script/Code.gs', 'apps-script/Admin.gs', 'apps-script/Exam.gs',
  'apps-script/Config.gs', 'apps-script/Setup.gs'
];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) { console.error('File wajib belum tersedia:', missing.join(', ')); process.exit(1); }
const types = fs.readFileSync(path.resolve('src/lib/api/types.ts'),'utf8');
for (const role of ['super_admin','teacher','student']) if (!types.includes(`'${role}'`)) { console.error('Role belum terdefinisi:',role); process.exit(1); }
const admin = fs.readFileSync(path.resolve('apps-script/Admin.gs'),'utf8');
const exam = fs.readFileSync(path.resolve('apps-script/Exam.gs'),'utf8');
const config = fs.readFileSync(path.resolve('apps-script/Config.gs'),'utf8');
const editor = fs.readFileSync(path.resolve('src/components/rich-editor.tsx'),'utf8');
const bank = fs.readFileSync(path.resolve('src/components/question-manager.tsx'),'utf8');
const manager = fs.readFileSync(path.resolve('src/components/exam-manager.tsx'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'),'utf8'));
const checks = [
  [admin.includes('saveExamQuestions_') && admin.includes('getExamQuestionIds_'), 'Pemetaan bank soal -> ujian belum terpasang.'],
  [config.includes('EXAM_QUESTIONS'), 'Sheet EXAM_QUESTIONS belum ada.'],
  [exam.includes("rows_('EXAM_QUESTIONS')"), 'Exam engine belum membaca pemetaan soal.'],
  [editor.includes('insertLatex') && editor.includes('isSourceMode') && editor.includes('Table2'), 'WYSIWYG/LaTeX/source HTML/tabel belum lengkap.'],
  [bank.includes('MULTIPLE_CHOICE') && bank.includes('TRUE_FALSE') && bank.includes('question-import-template.xlsx'), 'Bank soal full parity belum lengkap.'],
  [manager.includes('Pemetaan soal') && manager.includes('saveExamQuestions'), 'UI pemetaan soal ujian belum lengkap.'],
  [admin.includes('listQuestionPackages_') && admin.includes('applyQuestionPackage_') && config.includes('packageName') && config.includes('category'), 'Kategori/Paket Soal backend belum lengkap.'],
  [bank.includes('kategori_soal') && bank.includes('nama_tryout') && manager.includes('listQuestionPackages') && manager.includes('applyQuestionPackage'), 'Import paket soal atau pemilihan paket saat jadwal belum lengkap.'],
  [Boolean(pkg.dependencies?.katex) && Boolean(pkg.dependencies?.xlsx), 'Dependency KaTeX/XLSX belum ada.'],
];
for (const [ok,message] of checks) if (!ok) { console.error(message); process.exit(1); }
console.log(`OK: ${required.length} file inti tersedia. 3 role, WYSIWYG/LaTeX, Excel, reusable Bank Soal, kategori/paket soal, pemilihan paket saat jadwal, pemetaan ujian, dan Apps Script backend terdeteksi.`);
