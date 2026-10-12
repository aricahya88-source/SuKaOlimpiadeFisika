import {Pool} from 'pg';import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL wajib diisi.');const pool=new Pool({connectionString:process.env.DATABASE_URL});try{await pool.query(await readFile(new URL('../database/001-schema.sql',import.meta.url),'utf8'));console.log('Tabel berhasil disiapkan.');}finally{await pool.end();}
