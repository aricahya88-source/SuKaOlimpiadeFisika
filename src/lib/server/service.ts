import {randomBytes} from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import type {PoolClient} from 'pg';
import {database} from './db';import {digest,hashPassword,checkPassword} from './password';
import {createExamEngine} from './engine';import {loadStore,saveStore,stateUsers} from './store';
import type {User} from '../api/types';
const allowed=new Set(['login','logout','getSession','getAvailableExams','startExam','resumeAttempt','getQuestionsBatch','saveAnswers','submitExam','getResult','getMyResults','getDashboardStats','listExams','saveExam','deleteExam','duplicateExam','getExamQuestionIds','saveExamQuestions','listQuestionPackages','applyQuestionPackage','listQuestions','validateQuestion','listValidators','listAssignments','saveAssignments','saveQuestion','deleteQuestion','importQuestionsCsv','uploadQuestionImage','listStudents','saveStudent','deleteStudent','importStudents','listUsers','saveUser','deleteUser','listTeachers','saveTeacher','deleteTeacher','getMonitoring','setAttemptPaused','warnAttempt','resetAttempt','getAttemptControl','reportFocusViolation','getAdminResults']);
function assert(ok:unknown,msg:string):asserts ok{if(!ok)throw new Error(msg);}
const clean=(html:unknown)=>sanitizeHtml(String(html||''),{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['img','span','sub','sup']),allowedAttributes:{'*':['class','style'],img:['src','alt','width','height']},allowedSchemes:['https','http','data'],allowedStyles:{'*':{'text-align':[/^(left|right|center|justify)$/],'font-size':[/^\d+(px|em|rem|%)$/],color:[/^#[0-9a-f]+$/i]}}});
const publicExam=(x:any)=>{const {token,...rest}=x;return {...rest,tokenRequired:!!token};};
const visibleResult=(r:any)=>r&&!r.visible?null:r;
export async function execute(action:string,args:any[],source:string,db=database()){
 assert(allowed.has(action),'Aksi tidak dikenal.');assert(Array.isArray(args)&&args.length<=6,'Parameter tidak valid.');
 const c=await db.connect();
 try{
 await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='20s'");await c.query('SELECT pg_advisory_xact_lock(731045)');
 if(action==='login'){
  const [name,password]=args;assert(typeof name==='string'&&name.length<120,'Username tidak valid.');const key=digest(source+':'+name.toLowerCase());
  await c.query("INSERT INTO suka_login_limits(id) VALUES($1) ON CONFLICT DO NOTHING",[key]);
  await c.query("UPDATE suka_login_limits SET failures=0,window_start=now() WHERE id=$1 AND window_start<now()-interval '15 minutes'",[key]);
  const limits=await c.query('SELECT failures FROM suka_login_limits WHERE id=$1',[key]);assert(limits.rows[0].failures<10,'Terlalu banyak percobaan login. Tunggu 15 menit.');
  const r=await c.query('SELECT * FROM suka_users WHERE lower(username)=lower($1)',[name.trim()]);const row=r.rows[0];
  if(!row||row.data.status!=='ACTIVE'||!checkPassword(password,row.password_hash)){
   await c.query('UPDATE suka_login_limits SET failures=failures+1 WHERE id=$1',[key]);await c.query('COMMIT');throw new Error('Username atau password salah.');
  }
  const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+12*3600000).toISOString();
  await c.query('INSERT INTO suka_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[digest(token),row.id,expiresAt]);await c.query('DELETE FROM suka_login_limits WHERE id=$1',[key]);await c.query("DELETE FROM suka_sessions WHERE expires_at<now()");await c.query('COMMIT');return {token,user:row.data,expiresAt};
 }
 const token=args[0];assert(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'Sesi tidak valid. Silakan login kembali.');
 const sr=await c.query('SELECT u.data,s.expires_at FROM suka_sessions s JOIN suka_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);assert(sr.rows[0]?.data.status==='ACTIVE','Sesi telah berakhir. Silakan login kembali.');const user:User=sr.rows[0].data;
 if(action==='logout'){await c.query('DELETE FROM suka_sessions WHERE token_hash=$1',[digest(token)]);await c.query('COMMIT');return null;}
 if(action==='getSession'){await c.query('COMMIT');return {token,user,expiresAt:sr.rows[0].expires_at.toISOString()};}
 const store=await loadStore(c),before=structuredClone(store);const engine:any=createExamEngine(store,user);
 const manages=(id:string)=>store.exams.some(e=>e.examId===id&&(user.role==='super_admin'||user.role==='teacher'&&e.ownerId===user.userId));
 const a:any=store.attempts.find(a=>a.attemptId===args[1]||a.attemptId===args[1]?.attemptId);
 if(user.role==='validator')assert(['listQuestions','validateQuestion','saveQuestion','uploadQuestionImage','listValidators','listAssignments','getDashboardStats'].includes(action),'Validator tidak diizinkan melakukan aksi ini.');
 if(user.role==='student')assert(['getAvailableExams','startExam','resumeAttempt','getQuestionsBatch','saveAnswers','submitExam','getResult','getMyResults','getAttemptControl','reportFocusViolation'].includes(action),'Aksi hanya untuk panitia.');
 if(action==='startExam'){
  const e=store.exams.find(x=>x.examId===args[1]);assert(e&&e.className===user.className,'Ujian tidak tersedia untuk kelas Anda.');
  assert(['OPEN','SCHEDULED','ACTIVE','PUBLISHED'].includes(e.status)&&Date.now()>=Date.parse(e.startTime)&&Date.now()<Date.parse(e.endTime),'Ujian belum dimulai, dijeda, atau sudah berakhir.');assert((store.examMappings[e.examId]||[]).some(id=>store.questions.some(q=>q.questionId===id&&q.status==='PUBLISHED')),'Ujian belum memiliki soal PUBLISHED.');
  assert(!store.attempts.some(a=>a.examId===e.examId&&a.studentId===user.userId&&['SUBMITTED','EXPIRED'].includes(a.status)),'Ujian sudah selesai.');
 }
 if(['resumeAttempt','getQuestionsBatch','saveAnswers','submitExam','getAttemptControl','reportFocusViolation'].includes(action)){
  assert(a&&a.studentId===user.userId,'Pengerjaan tidak ditemukan.');
  if(['saveAnswers','submitExam'].includes(action)){
   assert(a.status!=='PAUSED','Pengerjaan sedang dijeda.');
   const alreadySubmitted=a.status==='SUBMITTED';assert(alreadySubmitted&&action==='submitExam'||a.status==='IN_PROGRESS','Pengerjaan sudah berakhir.');const revision=action==='saveAnswers'?args[2]:args[1].revision;assert(Number.isInteger(revision)&&(alreadySubmitted||revision>=a.revision),'Revisi jawaban sudah kedaluwarsa. Muat ulang pengerjaan.');
   const answers=action==='saveAnswers'?args[3]:args[1].answers;assert(answers&&typeof answers==='object'&&!Array.isArray(answers),'Jawaban tidak valid.');
   for(const [id,val] of Object.entries(answers)){assert(a.questionOrder.includes(id)&&typeof val==='string'&&val.length<10000,'Jawaban di luar pengerjaan.');}
   if(Date.now()>Date.parse(a.expiresAt)){if(action==='saveAnswers')throw new Error('Waktu ujian telah berakhir.');args[1].answers={};}
   if(action==='submitExam')assert(typeof args[1].submissionId==='string'&&args[1].submissionId.length<200,'ID pengumpulan tidak valid.');
  }
 }
 if(['resumeAttempt','getQuestionsBatch'].includes(action)){args[2]=Math.max(0,Math.floor(Number(args[2])||0));args[3]=Math.min(50,Math.max(1,Math.floor(Number(args[3])||10)));}
 if(action==='reportFocusViolation')args[2]=Math.min(20,Math.max(1,Math.floor(Number(args[2])||1)));
 if(['saveExam','saveQuestion','saveStudent','saveTeacher','saveUser'].includes(action)){
  assert(args[1]&&typeof args[1]==='object'&&!Array.isArray(args[1]),'Data tidak valid.');const i=args[1];delete i.passwordHash;
  for(const k of ['questionHtml','questionText','optionA','optionB','optionC','optionD','optionE','explanation','descriptionHtml','rulesHtml','instructions'])if(k in i)i[k]=clean(i[k]);
  if(i.interactionData)for(const side of ['left','right']){assert(Array.isArray(i.interactionData[side])&&i.interactionData[side].length<=5,'Pasangan maksimum 5 item.');for(const item of i.interactionData[side])item.text=clean(item.text);}
  if(['saveStudent','saveTeacher','saveUser'].includes(action)){const old=(await c.query('SELECT data FROM suka_users WHERE id=$1',[i.userId||''])).rows[0]?.data;if(action==='saveStudent')assert(!old||old.role==='student','Akun bukan peserta.');if(action==='saveTeacher')assert(!old||old.role==='teacher','Akun bukan panitia.');if(action==='saveUser'&&old&&old.role!==i.role){assert(user.role==='super_admin','Hanya Super Admin dapat mengubah role.');assert(old.userId!==user.userId,'Role akun sendiri tidak dapat diubah.');}}
  if(action==='saveExam'){assert(Number.isFinite(i.durationMinutes)&&i.durationMinutes>0&&Date.parse(i.endTime)>Date.parse(i.startTime),'Durasi/jadwal tidak valid.');}
  if(action==='saveQuestion'){
   assert(['SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','MATCHING'].includes(i.questionType)&&['EXACT_MATCH','PARTIAL_NO_PENALTY'].includes(i.scoringMode)&&['DRAFT','REVIEW','PUBLISHED','ARCHIVED'].includes(i.status),'Tipe/status soal tidak valid.');assert(Number.isFinite(i.maxScore)&&i.maxScore>0&&i.correctAnswers,'Bobot/kunci jawaban wajib diisi.');
   if(i.examId)assert(manages(i.examId),'Tidak dapat memasukkan soal ke ujian ini.');if(user.role==='validator'){assert(store.questions.some(q=>q.questionId===i.questionId),'Validator hanya dapat mengedit soal yang ada.');delete i.examId;}
  }
 }
 if(action==='deleteExam')assert(!store.attempts.some(a=>a.examId===args[1]),'Ujian dengan pengerjaan harus diarsipkan, bukan dihapus.');
 if(action==='deleteUser'||action==='deleteStudent'||action==='deleteTeacher'){const target=(await c.query('SELECT data FROM suka_users WHERE id=$1',[args[1]])).rows[0]?.data;if(action==='deleteStudent')assert(!target||target.role==='student','Akun bukan peserta.');if(action==='deleteTeacher')assert(!target||target.role==='teacher','Akun bukan panitia.');assert(args[1]!==user.userId,'Tidak dapat menghapus akun sendiri.');assert(!store.attempts.some(a=>a.studentId===args[1])&&!store.exams.some(e=>e.ownerId===args[1]),'Akun memiliki data ujian. Nonaktifkan akun.');}
 if(action==='validateQuestion'){
 assert(['APPROVED','REVISION_REQUIRED','REJECTED'].includes(args[2]),'Keputusan validasi tidak valid.');
 const q=store.questions.find(q=>q.questionId===args[1]);assert(q,'Soal tidak ditemukan.');
 if(!store.assignments.some(a=>a.questionId===args[1]&&a.validatorId===user.userId))store.assignments.push({assignmentId:'AS-'+randomBytes(12).toString('hex'),questionId:q.questionId,validatorId:user.userId,validatorName:user.name,status:'PENDING',authorId:q.authorId,authorName:q.authorName});
 }
 let result:any;
 if(action==='listUsers'){assert(user.role==='super_admin','Hanya Super Admin.');result=(await c.query('SELECT data FROM suka_users')).rows.map(r=>r.data);}
 else if(action==='listAssignments'&&user.role==='validator')result=store.questions.map(q=>({assignmentId:'summary-'+q.questionId,questionId:q.questionId,validatorId:user.userId,validatorName:user.name,status:store.validations[q.questionId]?.status||'PENDING',questionText:q.questionText}));
 else if(action==='getDashboardStats'&&user.role==='validator')result={activeExams:0,upcomingExams:0,students:0,inProgress:store.questions.filter(q=>!store.validations[q.questionId]||store.validations[q.questionId].status!=='APPROVED').length,submitted:Object.values(store.validations).filter(v=>v.status==='APPROVED').length,notSubmitted:0};
 else if(action==='saveUser'){
  assert(user.role==='super_admin','Hanya Super Admin.');const i=args[1];
  assert(['super_admin','teacher','validator','student'].includes(i.role),'Role tidak valid.');
  if(i.role==='student')assert(i.className?.trim(),'Kelas peserta wajib diisi.');
  if(['teacher','validator'].includes(i.role))assert(i.subject?.trim(),'Mata pelajaran wajib diisi.');
  const old=(await c.query('SELECT data FROM suka_users WHERE id=$1',[i.userId||''])).rows[0]?.data;
  if(old?.role==='super_admin'&&(i.role!=='super_admin'||i.status!=='ACTIVE')){
   const active=(await c.query("SELECT id FROM suka_users WHERE data->>'role'='super_admin' AND data->>'status'='ACTIVE'")).rows;
   assert(active.some(u=>u.id!==old.userId),'Harus ada minimal satu Super Admin aktif.');
  }
  result={userId:i.userId||'U-'+randomBytes(12).toString('hex'),name:i.name,username:i.username,email:i.email,phone:i.phone,role:i.role,status:i.status,...(i.role==='student'?{className:i.className}:{}),...(['teacher','validator'].includes(i.role)?{subject:i.subject}:{})};
  store.students=store.students.filter(u=>u.userId!==result.userId);store.teachers=store.teachers.filter(u=>u.userId!==result.userId);store.validators=store.validators.filter(u=>u.userId!==result.userId);
  if(i.role==='student')store.students.push(result);if(i.role==='teacher')store.teachers.push(result);if(i.role==='validator')store.validators.push(result);
  if(old&&old.role!==i.role)await c.query('DELETE FROM suka_sessions WHERE user_id=$1',[result.userId]);
 }
 else if(action==='uploadQuestionImage'){
  assert(user.role!=='student','Tidak diizinkan.');const file=args[1];assert(file&&['image/png','image/jpeg','image/webp','image/gif'].includes(file.mimeType),'Gunakan PNG, JPG, WebP atau GIF.');assert(typeof file.base64==='string'&&file.base64.length<1400000,'Gambar maksimal 1 MB.');result={fileId:'IMG-'+randomBytes(12).toString('hex'),imageUrl:`data:${file.mimeType};base64,${file.base64}`,name:String(file.name||'image')};
 }else {
  // Freeze question content and answer keys for each attempt, even if validator edits the bank later.
  const bank=store.questions;if(a?.snapshot&&['resumeAttempt','getQuestionsBatch','submitExam'].includes(action))store.questions=a.snapshot;
  result=await engine[action](...args);store.questions=bank;
  if(action==='startExam'){const at:any=store.attempts.find(x=>x.attemptId===result.attempt.attemptId);if(!at.snapshot)at.snapshot=structuredClone(store.questions.filter(q=>at.questionOrder.includes(q.questionId)));}
 }
 if(['saveStudent','saveTeacher','saveUser'].includes(action))await persistUser(c,result,args[1].password);
 if(action==='importStudents')for(const u of stateUsers(store)){if(!before.students.some(b=>b.userId===u.userId)||before.students.some(b=>b.userId===u.userId&&JSON.stringify(b)!==JSON.stringify(u))){const row=args[1].find((r:any)=>String(r.username).toLowerCase()===u.username.toLowerCase());await persistUser(c,u,row?.password||args[2]);}}
 if(['deleteStudent','deleteTeacher','deleteUser'].includes(action))await c.query('DELETE FROM suka_users WHERE id=$1',[args[1]]);
 await saveStore(c,before,store);
 if(action==='getAvailableExams')result=result.map((e:any)=>{const r=publicExam(e);delete r.score;return r;});
 if(['startExam','resumeAttempt'].includes(action))result.attempt.exam=publicExam(result.attempt.exam);
 if(action==='getResult')result=visibleResult(result);if(action==='getMyResults')result=result.map(visibleResult).filter(Boolean);if(action==='submitExam')result.result=visibleResult(result.result);
 await c.query('COMMIT');return result??null;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
async function persistUser(c:PoolClient,u:User,password?:string){
 assert(u&&u.name?.trim()&&u.username?.trim()&&['ACTIVE','INACTIVE'].includes(u.status)&&['super_admin','teacher','validator','student'].includes(u.role),'Nama, username, status dan peran wajib valid.');
 const old=(await c.query('SELECT id FROM suka_users WHERE id=$1',[u.userId])).rows[0];assert(old||password,'Password wajib untuk akun baru.');
 if(password)await c.query('INSERT INTO suka_users(id,username,password_hash,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,data=excluded.data,updated_at=now()',[u.userId,u.username.trim(),hashPassword(password),JSON.stringify(u)]);
 else await c.query('UPDATE suka_users SET username=$2,data=$3,updated_at=now() WHERE id=$1',[u.userId,u.username.trim(),JSON.stringify(u)]);
 if(password||u.status==='INACTIVE')await c.query('DELETE FROM suka_sessions WHERE user_id=$1',[u.userId]);
}
