import {NextResponse} from 'next/server';import {execute} from '@/lib/server/service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{
  if(Number(req.headers.get('content-length')||0)>2500000)throw new Error('Data terlalu besar.');
  const text=await req.text();if(text.length>2500000)throw new Error('Data terlalu besar.');const {action,args}=JSON.parse(text);
  const data=await execute(action,args,req.headers.get('x-nf-client-connection-ip')||'unknown');return NextResponse.json({ok:true,data},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const err=e as Error&{code?:string};const infrastructure=!!err.code||/DATABASE_URL|connect|relation .*does not exist/i.test(err.message);return NextResponse.json({ok:false,error:infrastructure?'Database belum siap. Periksa konfigurasi Neon dan jalankan SQL tabel.':err.message},{status:infrastructure?503:400,headers:{'Cache-Control':'no-store'}});}
}
