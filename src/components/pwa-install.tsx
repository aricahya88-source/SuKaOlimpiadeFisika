'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function PwaInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (!event || installed) return null;
  return <div className="install-card"><span className="mini-icon blue"><Smartphone size={20}/></span><div><strong>Pasang SuKa Olimpiade Fisika</strong><small>Buka lebih cepat dari layar utama seperti aplikasi HP.</small></div><button className="button secondary" onClick={async () => { await event.prompt(); const choice = await event.userChoice; if (choice.outcome === 'accepted') setEvent(null); }}><Download size={17}/>Pasang</button></div>;
}
