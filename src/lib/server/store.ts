import type {PoolClient} from 'pg';
import type {EngineStore} from './engine';
import type {User} from '../api/types';
const tables={exams:['suka_exams','examId'],questions:['suka_questions','questionId'],attempts:['suka_attempts','attemptId'],submissions:['suka_submissions','submissionId'],assignments:['suka_assignments','assignmentId'],examMappings:['suka_exam_mappings',''],validations:['suka_validations','']} as const;
export async function loadStore(c:PoolClient):Promise<EngineStore>{
 const s:any={students:[],teachers:[],validators:[]};
 for(const [key,[table,id]] of Object.entries(tables)){const r=await c.query(`SELECT id,data FROM ${table}`);s[key]=id?r.rows.map(x=>x.data):Object.fromEntries(r.rows.map(x=>[x.id,x.data]));}
 const users=await c.query('SELECT data FROM suka_users');for(const {data} of users.rows){if(data.role==='student')s.students.push(data);if(data.role==='teacher')s.teachers.push(data);if(data.role==='validator')s.validators.push(data);}
 return s;
}
export async function saveStore(c:PoolClient,before:EngineStore,after:EngineStore){
 for(const [key,[table,id]] of Object.entries(tables)){
  const map=(s:any)=>id?new Map(s[key].map((x:any)=>[x[id],x])):new Map(Object.entries(s[key]));const old=map(before),now=map(after);
  for(const [k,v] of now)if(JSON.stringify(old.get(k))!==JSON.stringify(v))await c.query(`INSERT INTO ${table}(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=excluded.data`,[k,JSON.stringify(v)]);
  for(const k of old.keys())if(!now.has(k))await c.query(`DELETE FROM ${table} WHERE id=$1`,[k]);
 }
}
export const stateUsers=(s:EngineStore):User[]=>[...s.students,...s.teachers,...s.validators];
