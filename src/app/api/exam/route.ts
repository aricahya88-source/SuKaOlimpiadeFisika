import {NextResponse} from 'next/server';import {execute} from '@/lib/server/service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 let actionName='unknown';
 try{
  if(Number(req.headers.get('content-length')||0)>2500000)throw new Error('Data terlalu besar.');
  const text=await req.text();if(text.length>2500000)throw new Error('Data terlalu besar.');const {action,args}=JSON.parse(text);
  if(typeof action==='string')actionName=action.slice(0,50);
  const data=await execute(action,args,req.headers.get('x-nf-client-connection-ip')||'unknown');return NextResponse.json({ok:true,data},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const err=e as Error&{code?:string};
  const transient=['57014','53300','55P03','57P03','08001','08006'].includes(err.code||'')||/timeout|ECONNRESET|ETIMEDOUT|connection terminated|remaining connection slots/i.test(err.message||'');
  const infrastructure=transient||!!err.code||/DATABASE_URL|connect|relation .*does not exist/i.test(err.message||'');
  // Never log usernames, passwords, exam tokens or submitted answers.
  console.error('[exam-api]',{action:actionName,code:err.code||'none',category:transient?'busy':infrastructure?'database':'application'});
  const message=transient?'Server ujian sedang sibuk. Tunggu 10 detik, lalu coba lagi tanpa menghapus data browser.':infrastructure?'Koneksi atau tabel database bermasalah. Hubungi panitia.':err.message;
  return NextResponse.json({ok:false,error:message},{status:infrastructure?503:400,headers:{'Cache-Control':'no-store'}});
 }
}
