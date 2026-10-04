/**
 * ============================================================
 * SAINSMAMBA - SETUP / REPAIR / RESET PASSWORD
 * ============================================================
 * Alur pemakaian:
 * 1. Isi SPREADSHEET_ID dan DRIVE_FOLDER_ID di StorageConfig.gs.
 * 2. Jalankan setupSainsMasemba().
 * 3. Izinkan permission Google saat diminta.
 * 4. Lihat Execution log untuk URL Spreadsheet/Drive dan status setup.
 *
 * Aman dijalankan ulang:
 * - tidak menghapus data yang sudah ada;
 * - membuat sheet yang belum ada;
 * - menambahkan header baru yang belum ada;
 * - mempertahankan password akun yang sudah ada.
 */
function setupSainsMasemba() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const config = validateSetupConfig_();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    ss.getName(); // validasi akses
    const rootFolder = DriveApp.getFolderById(config.DRIVE_FOLDER_ID);
    rootFolder.getName(); // validasi akses

    const props = PropertiesService.getScriptProperties();
    props.setProperties({
      SPREADSHEET_ID: config.SPREADSHEET_ID,
      DRIVE_FOLDER_ID: config.DRIVE_FOLDER_ID,
      PUBLIC_QUESTION_IMAGES: config.PUBLIC_QUESTION_IMAGES === false ? 'false' : 'true'
    }, false);

    getPepper_();
    ensureAllSheets_(ss);
    cleanupDefaultSheet_(ss);

    // Migrasi schema/data lama tanpa menghapus isi existing.
    migrateLegacyRoles_();

    const superAdminPassword = ensureInitialSuperAdmin_(config);

    let fallbackTeacherId = findFirstTeacherId_();
    if (config.CREATE_DEMO_ACCOUNTS === true) {
      ensureUser_({
        userId: 'T-001',
        name: 'Guru Fisika SainsMasemba',
        username: 'guru',
        email: 'guru@sainsmasemba.local',
        phone: '',
        className: '',
        subject: 'Fisika',
        role: 'teacher',
        password: 'guru123'
      });
      ensureUser_({
        userId: 'S-001',
        name: 'Siswa Demo',
        username: 'siswa',
        email: 'siswa@sainsmasemba.local',
        phone: '',
        className: 'XI IPA 1',
        subject: '',
        role: 'student',
        password: 'siswa123'
      });
      fallbackTeacherId = fallbackTeacherId || 'T-001';
    }

    if (fallbackTeacherId) migrateExamOwners_(fallbackTeacherId);
    migrateQuestionBank_(fallbackTeacherId || 'SA-001');

    if (config.CREATE_DEMO_EXAM === true) {
      if (!findRowByKey_('USERS', 'userId', 'T-001')) {
        ensureUser_({
          userId: 'T-001',
          name: 'Guru Fisika SainsMasemba',
          username: 'guru',
          email: 'guru@sainsmasemba.local',
          phone: '',
          className: '',
          subject: 'Fisika',
          role: 'teacher',
          password: 'guru123'
        });
      }
      if (!findRowByKey_('EXAMS', 'examId', 'EX-DEMO-001')) seedDemoExam_();
    }

    SpreadsheetApp.flush();

    const result = {
      success: true,
      spreadsheetId: config.SPREADSHEET_ID,
      spreadsheetUrl: ss.getUrl(),
      spreadsheetName: ss.getName(),
      driveFolderId: config.DRIVE_FOLDER_ID,
      driveFolderUrl: rootFolder.getUrl(),
      driveFolderName: rootFolder.getName(),
      superAdminUsername: config.SUPER_ADMIN_USERNAME,
      temporarySuperAdminPassword: superAdminPassword,
      sheets: Object.keys(SM.SHEETS),
      message: 'Setup SainsMasemba selesai. Sheet/header siap dan konfigurasi tersimpan.'
    };

    console.log('=== SAINSMAMBA SIAP ===');
    console.log('Spreadsheet : ' + result.spreadsheetUrl);
    console.log('Drive folder: ' + result.driveFolderUrl);
    console.log('Super Admin : ' + result.superAdminUsername);
    if (superAdminPassword) console.log('Password awal Super Admin: ' + superAdminPassword);
    else console.log('Password Super Admin existing tidak diubah.');
    console.log('Sheet: ' + result.sheets.join(', '));
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Repair schema tanpa menghapus data.
 * Berguna setelah update kode yang menambahkan kolom/sheet baru.
 */
function repairSainsMasemba() {
  const config = validateSetupConfig_();
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    SPREADSHEET_ID: config.SPREADSHEET_ID,
    DRIVE_FOLDER_ID: config.DRIVE_FOLDER_ID,
    PUBLIC_QUESTION_IMAGES: config.PUBLIC_QUESTION_IMAGES === false ? 'false' : 'true'
  }, false);

  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  DriveApp.getFolderById(config.DRIVE_FOLDER_ID).getName();
  ensureAllSheets_(ss);
  cleanupDefaultSheet_(ss);
  migrateLegacyRoles_();
  const fallbackTeacherId = findFirstTeacherId_();
  if (fallbackTeacherId) migrateExamOwners_(fallbackTeacherId);
  migrateQuestionBank_(fallbackTeacherId || 'SA-001');
  SpreadsheetApp.flush();

  const result = {
    success: true,
    message: 'Repair schema selesai tanpa menghapus data.',
    spreadsheetUrl: ss.getUrl(),
    sheets: Object.keys(SM.SHEETS)
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Tampilkan ID dan URL konfigurasi yang sedang aktif.
 */
function showConfiguration() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID') || '';
  const driveFolderId = props.getProperty('DRIVE_FOLDER_ID') || '';
  const result = {
    SPREADSHEET_ID: spreadsheetId,
    SPREADSHEET_URL: spreadsheetId ? 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit' : '',
    DRIVE_FOLDER_ID: driveFolderId,
    DRIVE_FOLDER_URL: driveFolderId ? 'https://drive.google.com/drive/folders/' + driveFolderId : '',
    PUBLIC_QUESTION_IMAGES: props.getProperty('PUBLIC_QUESTION_IMAGES') || ''
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * RESET PASSWORD SUPER ADMIN
 *
 * 1. Isi RESET_SUPER_ADMIN_PASSWORD di StorageConfig.gs.
 * 2. Pilih fungsi resetSuperAdminPassword() pada dropdown Apps Script.
 * 3. Klik Run.
 * 4. Semua session Super Admin lama akan dihapus sehingga wajib login ulang.
 */
function resetSuperAdminPassword() {
  const config = validateSetupConfig_();
  const newPassword = String(config.RESET_SUPER_ADMIN_PASSWORD || '').trim();
  if (!newPassword || newPassword.indexOf('GANTI_') === 0 || newPassword.length < 8) {
    throw new Error('Isi RESET_SUPER_ADMIN_PASSWORD pada StorageConfig.gs minimal 8 karakter sebelum menjalankan reset.');
  }

  // Pastikan Script Properties mengarah ke database yang benar walaupun setup belum dijalankan ulang.
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: config.SPREADSHEET_ID,
    DRIVE_FOLDER_ID: config.DRIVE_FOLDER_ID
  }, false);

  const username = String(config.SUPER_ADMIN_USERNAME || 'superadmin').trim().toLowerCase();
  const admin = rows_('USERS').find(function (u) {
    return String(u.role) === 'super_admin' && String(u.username || '').toLowerCase() === username;
  }) || rows_('USERS').find(function (u) {
    return String(u.role) === 'super_admin';
  });

  if (!admin) throw new Error('Super Admin belum ditemukan. Jalankan setupSainsMasemba() terlebih dahulu.');

  const salt = Utilities.getUuid();
  updateRowByKey_('USERS', 'userId', admin.userId, {
    passwordHash: hashPassword_(newPassword, salt),
    passwordSalt: salt,
    updatedAt: nowIso_()
  });

  // Logout semua session lama milik Super Admin setelah reset password.
  rows_('SESSIONS')
    .filter(function (s) { return String(s.userId) === String(admin.userId); })
    .forEach(function (s) { deleteRowByKey_('SESSIONS', 'token', s.token); });

  console.log('=== PASSWORD SUPER ADMIN BERHASIL DIRESET ===');
  console.log('Username: ' + admin.username);
  console.log('Password baru: ' + newPassword);
  console.log('Semua session lama Super Admin telah dihapus.');
  return {
    success: true,
    username: String(admin.username),
    password: newPassword,
    message: 'Password Super Admin berhasil direset.'
  };
}

function validateSetupConfig_() {
  if (typeof SM_STORAGE_CONFIG === 'undefined') {
    throw new Error('StorageConfig.gs belum ada. Tambahkan file tersebut terlebih dahulu.');
  }

  const spreadsheetId = String(SM_STORAGE_CONFIG.SPREADSHEET_ID || '').trim();
  const folderId = String(SM_STORAGE_CONFIG.DRIVE_FOLDER_ID || '').trim();
  if (!spreadsheetId || spreadsheetId.indexOf('PASTE_') === 0) {
    throw new Error('Isi SPREADSHEET_ID pada StorageConfig.gs.');
  }
  if (!folderId || folderId.indexOf('PASTE_') === 0) {
    throw new Error('Isi DRIVE_FOLDER_ID pada StorageConfig.gs.');
  }

  return {
    SPREADSHEET_ID: spreadsheetId,
    DRIVE_FOLDER_ID: folderId,
    PUBLIC_QUESTION_IMAGES: SM_STORAGE_CONFIG.PUBLIC_QUESTION_IMAGES !== false,
    SUPER_ADMIN_USERNAME: String(SM_STORAGE_CONFIG.SUPER_ADMIN_USERNAME || 'superadmin').trim(),
    SUPER_ADMIN_PASSWORD: String(SM_STORAGE_CONFIG.SUPER_ADMIN_PASSWORD || '').trim(),
    RESET_SUPER_ADMIN_PASSWORD: String(SM_STORAGE_CONFIG.RESET_SUPER_ADMIN_PASSWORD || '').trim(),
    CREATE_DEMO_ACCOUNTS: SM_STORAGE_CONFIG.CREATE_DEMO_ACCOUNTS === true,
    CREATE_DEMO_EXAM: SM_STORAGE_CONFIG.CREATE_DEMO_EXAM === true
  };
}

function ensureAllSheets_(ss) {
  Object.keys(SM.SHEETS).forEach(function (name) {
    ensureSheet_(ss, name, SM.SHEETS[name]);
  });
}

function cleanupDefaultSheet_(ss) {
  const sheet = ss.getSheetByName('Sheet1');
  if (!sheet || ss.getSheets().length <= 1) return;
  const hasContent = sheet.getLastRow() > 0 && sheet.getDataRange().getValues().some(function (row) {
    return row.some(function (value) { return String(value || '').trim() !== ''; });
  });
  if (!hasContent) ss.deleteSheet(sheet);
}

function ensureInitialSuperAdmin_(config) {
  const username = String(config.SUPER_ADMIN_USERNAME || 'superadmin').trim();
  const existing = rows_('USERS').find(function (u) {
    return String(u.role) === 'super_admin' && String(u.username || '').toLowerCase() === username.toLowerCase();
  });
  if (existing) return '';

  const password = String(config.SUPER_ADMIN_PASSWORD || '').trim();
  if (!password || password.indexOf('GANTI_') === 0 || password.length < 8) {
    throw new Error('Super Admin belum ada. Isi SUPER_ADMIN_PASSWORD pada StorageConfig.gs minimal 8 karakter.');
  }

  ensureUser_({
    userId: 'SA-001',
    name: 'Super Admin SainsMasemba',
    username: username,
    email: '',
    phone: '',
    className: '',
    subject: '',
    role: 'super_admin',
    password: password
  });
  return password;
}

function findFirstTeacherId_() {
  const teacher = rows_('USERS').find(function (u) { return String(u.role) === 'teacher'; });
  return teacher ? String(teacher.userId) : '';
}

function ensureUser_(input) {
  const existing = findRowByKey_('USERS', 'username', input.username);
  if (existing) {
    updateRowByKey_('USERS', 'userId', existing.userId, {
      email: input.email || existing.email || '',
      phone: input.phone || existing.phone || '',
      role: input.role,
      subject: input.subject || existing.subject || '',
      className: input.className || existing.className || '',
      updatedAt: nowIso_()
    });
    return '(password existing tidak diubah)';
  }
  const salt = Utilities.getUuid();
  appendObject_('USERS', {
    userId: input.userId,
    name: input.name,
    email: input.email || '',
    phone: input.phone || '',
    className: input.className || '',
    subject: input.subject || '',
    username: input.username,
    passwordHash: hashPassword_(input.password, salt),
    passwordSalt: salt,
    role: input.role,
    status: 'ACTIVE',
    createdAt: nowIso_(),
    updatedAt: nowIso_()
  });
  return input.password;
}

function migrateLegacyRoles_() {
  rows_('USERS')
    .filter(function (u) { return String(u.role) === 'admin'; })
    .forEach(function (u) {
      updateRowByKey_('USERS', 'userId', u.userId, { role: 'super_admin', updatedAt: nowIso_() });
    });
}

function migrateExamOwners_(fallbackTeacherId) {
  if (!fallbackTeacherId) return;
  rows_('EXAMS')
    .filter(function (e) { return !e.ownerId; })
    .forEach(function (e) {
      updateRowByKey_('EXAMS', 'examId', e.examId, { ownerId: fallbackTeacherId, updatedAt: nowIso_() });
    });
}

function migrateQuestionBank_(fallbackAuthorId) {
  const exams = rows_('EXAMS');
  const maps = rows_('EXAM_QUESTIONS');
  const fallback = String(fallbackAuthorId || 'SA-001');
  rows_('QUESTIONS').forEach(function (q) {
    let authorId = String(q.authorId || '');
    if (!authorId && q.examId) {
      const exam = exams.find(function (e) { return String(e.examId) === String(q.examId); });
      authorId = exam ? String(exam.ownerId || '') : '';
    }
    if (!authorId) authorId = fallback;
    if (String(q.authorId || '') !== authorId) {
      updateRowByKey_('QUESTIONS', 'questionId', q.questionId, { authorId: authorId, updatedAt: nowIso_() });
    }
    if (q.examId && !maps.some(function (m) {
      return String(m.examId) === String(q.examId) && String(m.questionId) === String(q.questionId);
    })) {
      const order = maps.filter(function (m) { return String(m.examId) === String(q.examId); }).length + 1;
      appendObject_('EXAM_QUESTIONS', { examId: String(q.examId), questionId: String(q.questionId), orderNo: order });
      maps.push({ examId: String(q.examId), questionId: String(q.questionId), orderNo: order });
    }
  });
}

function seedDemoExam_() {
  const examId = 'EX-DEMO-001';
  const start = new Date(Date.now() - 3600000);
  const end = new Date(Date.now() + 7 * 24 * 3600000);
  appendObject_('EXAMS', {
    examId: examId,
    ownerId: 'T-001',
    title: 'Ulangan Harian Fisika',
    subject: 'Fisika',
    className: 'XI IPA 1',
    descriptionHtml: '<p>Ulangan harian dengan dukungan <strong>WYSIWYG</strong> dan LaTeX seperti \\(F=ma\\).</p>',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMinutes: 45,
    questionCount: 5,
    status: 'OPEN',
    randomizeQuestion: true,
    randomizeOption: true,
    resultVisibility: 'immediate',
    token: 'FISIKA26',
    attemptPolicy: 'single',
    instructions: 'Pastikan seluruh jawaban tersimpan sebelum mengumpulkan.',
    rulesHtml: '<ol><li>Kerjakan mandiri.</li><li>Dilarang menutup aplikasi sebelum submit berhasil.</li></ol>',
    createdAt: nowIso_(),
    updatedAt: nowIso_()
  });
  const data = [
    ['Besaran yang memiliki satuan SI newton adalah ...', 'gaya', 'usaha', 'daya', 'tekanan', 'A'],
    ['Sebuah benda bergerak dengan kecepatan 10 m/s selama 5 s. Jarak yang ditempuh adalah ...', '2 m', '15 m', '50 m', '100 m', 'C'],
    ['Hukum Newton I membahas tentang ...', 'aksi-reaksi', 'kelembaman benda', 'percepatan benda', 'gravitasi', 'B'],
    ['Satuan SI untuk energi adalah ...', 'watt', 'pascal', 'joule', 'newton', 'C'],
    ['Jika massa benda 2 kg dan percepatannya 3 m/s², gaya resultannya adalah ...', '5 N', '6 N', '8 N', '9 N', 'B']
  ];
  data.forEach(function (q, i) {
    const id = 'Q-DEMO-' + String(i + 1).padStart(3, '0');
    appendObject_('QUESTIONS', {
      questionId: id,
      examId: '',
      authorId: 'T-001',
      topicCode: 'Fisika Dasar',
      blueprintCode: '',
      code: 'FIS-' + String(i + 1).padStart(3, '0'),
      stimulusOrder: i + 1,
      questionText: q[0],
      questionHtml: '<p>' + q[0] + '</p>',
      explanation: '<p>Kunci jawaban: <strong>' + q[5] + '</strong>.</p>',
      optionA: '<p>' + q[1] + '</p>',
      optionB: '<p>' + q[2] + '</p>',
      optionC: '<p>' + q[3] + '</p>',
      optionD: '<p>' + q[4] + '</p>',
      optionE: '',
      imageFileId: '',
      questionType: 'SINGLE_CHOICE',
      scoringMode: 'EXACT_MATCH',
      maxScore: 20,
      difficulty: i < 2 ? 'Mudah' : 'Sedang',
      tag: 'Fisika Dasar',
      status: 'PUBLISHED',
      createdAt: nowIso_(),
      updatedAt: nowIso_()
    });
    appendObject_('ANSWER_KEYS', { questionId: id, correctAnswer: q[5], correctAnswers: q[5], score: 20, maxScore: 20 });
    appendObject_('EXAM_QUESTIONS', { examId: examId, questionId: id, orderNo: i + 1 });
  });
}
