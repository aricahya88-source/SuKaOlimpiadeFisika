import { Mail } from 'lucide-react';
import { PageHeader } from '@/components/ui';

const DEVELOPERS = [
  {
    name: 'Ari C Mawardi, M.Pd',
    role: 'Pengembang',
    email: 'ari.cahya88@gmail.com',
    photo: '/developers/ari-c-mawardi.png',
  },
];

export function DeveloperPage() {
  return (
    <div className="developer-page">
      <PageHeader eyebrow="PENGEMBANG" title="Tim Pengembang" description="Aplikasi SuKa Olimpiade Fisika dikembangkan dengan bantuan Artificial Intelligence (AI) untuk membantu perancangan, pemrograman, pengujian, dan penyempurnaan fitur aplikasi." />
      <section className="developer-grid">
        {DEVELOPERS.map((developer) => (
          <article key={developer.email} className="developer-card">
            <img className="developer-photo" src={developer.photo} alt={developer.name} />
            <div className="developer-role">{developer.role}</div>
            <div className="developer-name">{developer.name}</div>
            <a className="developer-email" href={`mailto:${developer.email}`}>
              <Mail size={18} />
              <span>{developer.email}</span>
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
