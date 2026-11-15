/* Node built-in regression tests for the answer-recovery patch.
 * Run after npm ci: node --test tests/recovery-patch.test.cjs
 * Uses TypeScript (already a devDependency), node:test, and no live database.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function loadTs(rel, mocks={}) {
  const file=path.join(root,rel);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    fileName:file,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText;
  const module={exports:{}};
  const mockRequire=(id)=>Object.prototype.hasOwnProperty.call(mocks,id)?mocks[id]:require(id);
  const script=new vm.Script(`(function(require,module,exports){${code}\n})`,{filename:file});
  const fn=script.runInNewContext({console,Date,Math,Map,Set,JSON,Error,Object,Array,String,Number,Promise,structuredClone,Buffer,setTimeout});
  fn(mockRequire,module,module.exports);
  return module.exports;
}
const {differingAnswerIds: rawDifferences}=loadTs('src/lib/answer-sync.ts');
const differingAnswerIds=(a,b)=>Array.from(rawDifferences(a,b));

test('mencocokkan seluruh nilai jawaban, termasuk PG kompleks dan menjodohkan',()=>{
  const local={PG:'C',PGK:'A,C',BS:'B,S,B',MJ:'{"L1":"R2","L2":"R1"}'};
  assert.deepEqual(differingAnswerIds(local,{...local}),[]);
  assert.deepEqual(differingAnswerIds(local,{...local,PGK:'A,B,C'}),['PGK']);
  assert.deepEqual(differingAnswerIds(local,{...local,MJ:'{"L1":"R1","L2":"R2"}'}),['MJ']);
  assert.deepEqual(differingAnswerIds(local,undefined).sort(),Object.keys(local).sort());
});

test('jawaban kosong dan kunci belum dipilih dianggap sama',()=>{
  assert.deepEqual(differingAnswerIds({Q1:''},{}),[]);
  assert.deepEqual(differingAnswerIds({Q1:'B'},{Q1:''}),['Q1']);
});

const engineExports=loadTs('src/lib/server/engine.ts', {
  'sanitize-html':()=>'',
  '@/lib/simulation':{isSimulationUrlAllowed:()=>true},
  '@/lib/exam-availability':{isExamStartableNow:()=>true,isExamVisibleToStudents:()=>true},
  '@/lib/grading':{gradeQuestion:(q,answer)=>({max:1,points:answer===q.correctAnswers?1:0,correct:answer===q.correctAnswers,blank:!answer})},
});
const user={userId:'student-1',username:'participant',name:'Peserta Tes',role:'student',className:'C1',status:'ACTIVE'};
function fixture(expiresAt) {
 const attempt={attemptId:'ATT-1',examId:'EX-1',studentId:user.userId,startedAt:new Date(Date.now()-60_000).toISOString(),expiresAt,status:'IN_PROGRESS',questionOrder:['Q1'],optionOrders:{},answers:{Q1:'A'},revision:0,focusViolationCount:0};
 const store={exams:[{examId:'EX-1',title:'Uji Soal',subject:'Fisika',className:'C1',ownerId:'teacher',endTime:new Date(Date.now()+360000).toISOString(),resultVisibility:'immediate',durationMinutes:150,status:'PUBLISHED',questionCount:1}],questions:[{questionId:'Q1',optionA:'Salah',optionB:'Benar',questionText:'Contoh',correctAnswers:'B',questionType:'SINGLE_CHOICE',scoringMode:'EXACT_MATCH',maxScore:1,status:'PUBLISHED'}],students:[user],teachers:[],validators:[],examMappings:{'EX-1':['Q1']},attempts:[attempt],submissions:[],validations:{},assignments:[]};
 return {store,attempt};
}

test('sebelum kedaluwarsa: autosave mendapat bukti jawaban yang disimpan', async()=>{
  const {store,attempt}=fixture(new Date(Date.now()+10*60_000).toISOString());
  const engine=engineExports.createExamEngine(store,user);
  const r=await engine.saveAnswers('ignored',attempt.attemptId,1,{Q1:'B'});
  assert.deepEqual({...r.confirmedAnswers},{Q1:'B'});
  assert.equal(attempt.answers.Q1,'B');
});

test('sesudah kedaluwarsa: autosave ditolak, dan pengumpulan demo tidak menerima jawaban baru', async()=>{
  const {store,attempt}=fixture(new Date(Date.now()-5000).toISOString());
  const engine=engineExports.createExamEngine(store,user);
  await assert.rejects(engine.saveAnswers('ignored',attempt.attemptId,1,{Q1:'B'}),/Waktu ujian telah berakhir/);
  const r=await engine.submitExam('ignored',{attemptId:attempt.attemptId,submissionId:'S-1',revision:1,answers:{Q1:'B'}});
  assert.deepEqual({...r.confirmedAnswers},{Q1:'A'});
  assert.deepEqual(differingAnswerIds({Q1:'B'},r.confirmedAnswers),['Q1']);
  assert.equal(r.result.score,0);
});

test('sebelum kedaluwarsa: pengumpulan menerima revisi terakhir dan nilai tepat', async()=>{
  const {store,attempt}=fixture(new Date(Date.now()+10*60_000).toISOString());
  const engine=engineExports.createExamEngine(store,user);
  const r=await engine.submitExam('ignored',{attemptId:attempt.attemptId,submissionId:'S-2',revision:1,answers:{Q1:'B'}});
  assert.deepEqual({...r.confirmedAnswers},{Q1:'B'});
  assert.deepEqual(differingAnswerIds({Q1:'B'},r.confirmedAnswers),[]);
  assert.equal(r.result.score,100);
  const retry=await engine.submitExam('ignored',{attemptId:attempt.attemptId,submissionId:'S-2',revision:2,answers:{Q1:'A'}});
  assert.equal(retry.alreadySubmitted,true);
  assert.deepEqual({...retry.confirmedAnswers},{Q1:'B'});
  assert.equal(retry.result.score,100);
});

// These checks exercise the real execute() authorization and deadline path with
// an in-memory transaction adapter; they do NOT require a production database.
const sanitize=()=>''; sanitize.defaults={allowedTags:[]};
let backingStore;
const serviceExports=loadTs('src/lib/server/service.ts',{
  'node:crypto':require('node:crypto'),
  'sanitize-html':sanitize,
  './db':{database:()=>{throw new Error('Live database must not be accessed during unit tests');}},
  './password':{digest:()=> 'hashed',hashPassword:()=>'',checkPassword:()=>true},
  './engine':engineExports,
  './store':{loadStore:async()=>backingStore,saveStore:async()=>{},stateUsers:()=>[]},
});
const token='a'.repeat(64);
const fakeDb={connect:async()=>({
  query:async(sql)=>{
    if(sql.includes('SELECT u.data,s.expires_at FROM suka_sessions'))
      return {rows:[{data:user,expires_at:new Date(Date.now()+24*3600_000)}]};
    return {rows:[]};
  },
  release:()=>{}
})};

test('Neon service: autosave pascatenggat ditolak oleh server', async()=>{
  const {store}=fixture(new Date(Date.now()-30_000).toISOString());
  backingStore=store;
  await assert.rejects(
    serviceExports.execute('saveAnswers',[token,'ATT-1',1,{Q1:'B'}],'test',fakeDb),
    /Waktu ujian telah berakhir/
  );
  assert.equal(store.attempts[0].answers.Q1,'A');
});

test('Neon service: submit pascatenggat mengakui hanya jawaban lama', async()=>{
  const {store}=fixture(new Date(Date.now()-30_000).toISOString());
  backingStore=store;
  const r=await serviceExports.execute('submitExam',[token,{attemptId:'ATT-1',submissionId:'S-late',revision:1,answers:{Q1:'B'}}],'test',fakeDb);
  assert.equal(r.accepted,true);
  assert.deepEqual({...r.confirmedAnswers},{Q1:'A'});
  assert.equal(r.result.score,0);
  assert.equal(store.attempts[0].status,'SUBMITTED');
});

test('Neon service: submit prategat mengakui jawaban terbaru', async()=>{
  const {store}=fixture(new Date(Date.now()+10*60_000).toISOString());
  backingStore=store;
  const r=await serviceExports.execute('submitExam',[token,{attemptId:'ATT-1',submissionId:'S-ontime',revision:1,answers:{Q1:'B'}}],'test',fakeDb);
  assert.equal(r.accepted,true);
  assert.deepEqual({...r.confirmedAnswers},{Q1:'B'});
  assert.equal(r.result.score,100);
});

test('Permintaan diterima SERVER sebelum tenggat tetap disimpan meski antrean database selesai sesudah tenggat', async()=>{
  const expiration=Date.now()-10_000;
  const {store}=fixture(new Date(expiration).toISOString());
  backingStore=store;
  const receivedAt=expiration-5000; // request arrived before deadline; transaction runs later
  const r=await serviceExports.execute('saveAnswers',[token,'ATT-1',1,{Q1:'B'}],'test',fakeDb,receivedAt);
  assert.deepEqual({...r.confirmedAnswers},{Q1:'B'});
  assert.equal(store.attempts[0].answers.Q1,'B');
});

test('Submit diterima server sebelum tenggat tidak kehilangan jawaban karena antrean database', async()=>{
  const expiration=Date.now()-10_000;
  const {store}=fixture(new Date(expiration).toISOString());
  backingStore=store;
  const r=await serviceExports.execute('submitExam',[token,{attemptId:'ATT-1',submissionId:'S-queued',revision:1,answers:{Q1:'B'}}],'test',fakeDb,expiration-5000);
  assert.deepEqual({...r.confirmedAnswers},{Q1:'B'});
  assert.equal(r.result.score,100);
});

test('Browser tidak boleh menyelundupkan timestamp palsu melalui argumen API',async()=>{
  const expires=Date.now()-30_000;
  const {store}=fixture(new Date(expires).toISOString());
  backingStore=store;
  await assert.rejects(
    serviceExports.execute('saveAnswers',[token,'ATT-1',1,{Q1:'B'},expires-60_000],'test',fakeDb),
    /Parameter autosave tidak valid/
  );
  await assert.rejects(
    serviceExports.execute('submitExam',[token,{attemptId:'ATT-1',submissionId:'FORGED',revision:1,answers:{Q1:'B'}},expires-60_000],'test',fakeDb),
    /Parameter pengumpulan tidak valid/
  );
  assert.equal(store.attempts[0].answers.Q1,'A');
});
