import type { ExamRecord, QuestionRecord, StudentRecord, TeacherRecord } from './api/types';

const now = new Date();
const start = new Date(now.getTime() - 30 * 60_000);
const end = new Date(now.getTime() + 24 * 60 * 60_000);
const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000);
const twoDays = new Date(now.getTime() + 48 * 60 * 60_000);


export const demoTeachers: TeacherRecord[] = [
  { userId: 'T-001', name: 'Budi Santoso, S.Pd.', username: 'panitia', subject: 'Fisika', role: 'teacher', status: 'ACTIVE' },
  { userId: 'T-002', name: 'Siti Rahma, S.Pd.', username: 'panitiabio', subject: 'Biologi', role: 'teacher', status: 'ACTIVE' },
];

export const demoStudents: StudentRecord[] = [
  { userId: 'S-001', name: 'Ahmad Fauzan', username: 'peserta', className: 'XI IPA 1', role: 'student', status: 'ACTIVE' },
  { userId: 'S-002', name: 'Nabila Putri', username: 'nabila', className: 'XI IPA 1', role: 'student', status: 'ACTIVE' },
  { userId: 'S-003', name: 'Raka Pratama', username: 'raka', className: 'XI IPA 2', role: 'student', status: 'ACTIVE' },
];

export const demoExams: ExamRecord[] = [
  {
    examId: 'EX-FIS-001', ownerId: 'T-001', ownerName: 'Budi Santoso, S.Pd.', title: 'Ulangan Harian Fisika', subject: 'Fisika', className: 'XI IPA 1',
    startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: 45, questionCount: 20,
    status: 'OPEN', resultVisibility: 'immediate', randomizeQuestion: true, randomizeOption: true,
    attemptPolicy: 'single', token: 'FISIKA26', tokenRequired: true, descriptionHtml: '<p>Ulangan harian Fisika dengan dukungan <strong>LaTeX</strong> seperti \(F=ma\).</p>', rulesHtml: '<ol><li>Kerjakan mandiri.</li><li>Periksa status sinkronisasi.</li></ol>',
    instructions: 'Pilih satu jawaban paling tepat. Pastikan seluruh jawaban telah tersimpan sebelum mengirim ujian.'
  },
  {
    examId: 'EX-BIO-001', ownerId: 'T-002', ownerName: 'Siti Rahma, S.Pd.', title: 'Kuis Sistem Ekskresi', subject: 'Biologi', className: 'XI IPA 1',
    startTime: tomorrow.toISOString(), endTime: twoDays.toISOString(), durationMinutes: 30, questionCount: 15,
    status: 'SCHEDULED', resultVisibility: 'after_exam_closed', randomizeQuestion: true, randomizeOption: false,
    attemptPolicy: 'single', descriptionHtml: '', rulesHtml: '<p>Kerjakan secara mandiri.</p>', instructions: 'Kerjakan secara mandiri. Waktu pengerjaan 30 menit.'
  },
];

const baseQuestions = [
  ['Besaran yang memiliki satuan SI newton adalah ...', 'gaya', 'usaha', 'daya', 'tekanan', 'A'],
  ['Sebuah benda bergerak dengan kecepatan 10 m/s selama 5 s. Jarak yang ditempuh adalah ...', '2 m', '15 m', '50 m', '100 m', 'C'],
  ['Hukum Newton I membahas tentang ...', 'aksi-reaksi', 'kelembaman benda', 'percepatan benda', 'gravitasi', 'B'],
  ['Satuan SI untuk energi adalah ...', 'watt', 'pascal', 'joule', 'newton', 'C'],
  ['Jika massa benda 2 kg dan percepatannya 3 m/s², gaya resultannya adalah ...', '5 N', '6 N', '8 N', '9 N', 'B'],
  ['Tekanan dirumuskan sebagai ...', 'gaya × luas', 'gaya / luas', 'massa / volume', 'usaha / waktu', 'B'],
  ['Alat untuk mengukur kuat arus listrik adalah ...', 'voltmeter', 'barometer', 'amperemeter', 'termometer', 'C'],
  ['Energi potensial gravitasi dipengaruhi oleh ...', 'massa dan ketinggian', 'waktu dan suhu', 'luas dan tekanan', 'arus dan tegangan', 'A'],
  ['Sebuah lampu 20 W menyala selama 5 s. Energi yang digunakan adalah ...', '4 J', '25 J', '100 J', '400 J', 'C'],
  ['Gerak lurus beraturan memiliki ...', 'percepatan tetap bukan nol', 'kecepatan tetap', 'jarak selalu nol', 'arah selalu berubah', 'B'],
  ['Gelombang yang memerlukan medium untuk merambat adalah ...', 'cahaya', 'radio', 'mekanik', 'elektromagnetik', 'C'],
  ['Frekuensi adalah banyaknya getaran per ...', 'meter', 'sekon', 'newton', 'joule', 'B'],
  ['Muatan listrik sejenis akan ...', 'tarik-menarik', 'tolak-menolak', 'menjadi netral', 'menghilang', 'B'],
  ['Hubungan V, I, dan R pada Hukum Ohm adalah ...', 'V = I × R', 'V = I / R', 'I = V × R', 'R = V × I', 'A'],
  ['Massa jenis adalah perbandingan antara ...', 'massa dan volume', 'gaya dan luas', 'jarak dan waktu', 'usaha dan energi', 'A'],
  ['Satuan tekanan dalam SI adalah ...', 'tesla', 'pascal', 'weber', 'candela', 'B'],
  ['Perubahan energi pada kipas angin adalah ...', 'listrik menjadi gerak', 'gerak menjadi kimia', 'panas menjadi listrik', 'kimia menjadi cahaya', 'A'],
  ['Percepatan gravitasi di permukaan bumi kira-kira ...', '1 m/s²', '5 m/s²', '9,8 m/s²', '98 m/s²', 'C'],
  ['Jika usaha 200 J dilakukan selama 10 s, dayanya ...', '10 W', '20 W', '100 W', '2000 W', 'B'],
  ['Momentum merupakan hasil kali ...', 'massa dan kecepatan', 'gaya dan waktu saja', 'massa dan percepatan', 'tekanan dan volume', 'A'],
] as const;

export const demoQuestions: QuestionRecord[] = baseQuestions.map((q, index) => ({
  questionId: `Q-${String(index + 1).padStart(3, '0')}`,
  examId: 'EX-FIS-001', authorId: 'T-001', authorName: 'Budi Santoso, S.Pd.', topicCode: 'FISIKA-DASAR', blueprintCode: '',
  code: `FIS-${String(index + 1).padStart(3, '0')}`, stimulusOrder: index + 1,
  questionText: q[0], questionHtml: index === 4 ? `<p>Jika massa benda <strong>2 kg</strong> dan percepatannya <span class="latex-token">\(3\,m/s^2\)</span>, gaya resultannya adalah ...</p>` : `<p>${q[0]}</p>`,
  explanation: `<p>Jawaban yang benar adalah <strong>${q[5]}</strong>.</p>`, optionA: `<p>${q[1]}</p>`, optionB: `<p>${q[2]}</p>`, optionC: `<p>${q[3]}</p>`, optionD: `<p>${q[4]}</p>`, optionE: '',
  correctAnswer: q[5], correctAnswers: q[5], score: 5, maxScore: 5, questionType: 'SINGLE_CHOICE', scoringMode: 'EXACT_MATCH', difficulty: index < 7 ? 'Mudah' : index < 14 ? 'Sedang' : 'Sulit',
  tag: 'Fisika Dasar', category: 'Ulangan Harian', packageName: 'Ulangan Harian Fisika', status: 'PUBLISHED'
}));
