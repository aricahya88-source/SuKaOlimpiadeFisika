import Image from 'next/image';

export function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) return <Image src="/suka-olimpiade-icon.svg" alt="SuKa Olimpiade Fisika" width={40} height={40} priority />;
  return <Image src="/suka-olimpiade-logo.svg" alt="SuKa Olimpiade Fisika" width={180} height={48} priority />;
}
