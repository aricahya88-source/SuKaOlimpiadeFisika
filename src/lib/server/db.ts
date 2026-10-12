import { Pool } from 'pg';
let pool:Pool|undefined;
export function database(){
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur.');
 return pool??=(new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:15000}));
}
