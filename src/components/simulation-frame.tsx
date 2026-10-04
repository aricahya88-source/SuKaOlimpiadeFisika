'use client';
import { isSimulationUrlAllowed } from '@/lib/simulation';
export function SimulationFrame({ enabled, url, title, description, aspectRatio='16/9' }: { enabled?: boolean; url?: string; title?: string; description?: string; aspectRatio?: string }) {
 if (!enabled || !url) return null;
 const allowed = isSimulationUrlAllowed(url);
 if (!allowed) return <div className="simulation-warning">Gunakan URL HTTPS dari GitHub Pages, Vercel, atau Netlify.</div>;
 return <section className="simulation-block"><div className="simulation-heading"><strong>{title || 'Simulasi Interaktif'}</strong><span>SIMULASI</span></div>{description&&<p>{description}</p>}<div className="simulation-viewport" style={{aspectRatio: ['16/9','4/3','1/1'].includes(aspectRatio)?aspectRatio:'16/9'}}><iframe src={url} title={title || 'Simulasi interaktif'} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" loading="lazy" allow="fullscreen" allowFullScreen /></div></section>;
}
