import {Pool} from 'pg';
import {randomBytes,scryptSync} from 'node:crypto';
const {DATABASE_URL,ADMIN_USERNAME,ADMIN_PASSWORD,ADMIN_NAME}=process.env;
if(!DATABASE_URL||!ADMIN_USERNAME||!ADMIN_PASSWORD||ADMIN_PASSWORD.length<12)throw new Error('Isi DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD (minimal 12 karakter).');
const pool=new Pool({connectionString:DATABASE_URL});
try{const salt=randomBytes(16).toString('hex'),hash=`${salt}:${scryptSync(ADMIN_PASSWORD,salt,64).toString('hex')}`;const id='SA-'+randomBytes(10).toString('hex');
await pool.query('INSERT INTO suka_users(id,username,password_hash,data) VALUES($1,$2,$3,$4)',[id,ADMIN_USERNAME,hash,JSON.stringify({userId:id,username:ADMIN_USERNAME,name:ADMIN_NAME||'Super Admin',role:'super_admin',status:'ACTIVE'})]);console.log('Super Admin berhasil dibuat.');}finally{await pool.end();}
