import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function hashPassword(p:string){if(typeof p!=='string'||p.length<8||p.length>256)throw new Error('Password harus 8–256 karakter.');const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(p,salt,64).toString('hex')}`;}
export function checkPassword(p:string,h:string){if(typeof p!=='string'||p.length>256)return false;const [s,k]=h.split(':');if(!s||!k)return false;const a=Buffer.from(k,'hex'),b=scryptSync(p,s,64);return a.length===b.length&&timingSafeEqual(a,b);}
