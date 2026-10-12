import {NextResponse} from 'next/server';import {database} from '@/lib/server/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{await database().query('SELECT 1 FROM suka_users LIMIT 1');return NextResponse.json({ok:true,backend:'neon'},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({ok:false,error:'Database/tabel belum siap.'},{status:503});}}
