import Link from 'next/link';
import { CloudOff } from 'lucide-react';
export default function OfflinePage(){return <main className="exam-error-page"><CloudOff size={44}/><h1>Anda sedang offline</h1><p>Halaman baru membutuhkan internet. Jika sedang mengerjakan ujian, kembali ke tab ujian yang sudah terbuka agar soal yang telah diprefetch tetap dapat digunakan.</p><Link className="button primary" href="/">Coba lagi</Link></main>}
