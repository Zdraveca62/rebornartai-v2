'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale) => {
    const newPath = newLocale === 'bg' 
      ? pathname.replace('/en', '') || '/'
      : `/en${pathname}`;
    router.push(newPath);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={() => switchLocale('bg')}
        style={{ 
          opacity: locale === 'bg' ? 1 : 0.5,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px'
        }}
      >
        🇧🇬
      </button>
      <button
        onClick={() => switchLocale('en')}
        style={{ 
          opacity: locale === 'en' ? 1 : 0.5,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px'
        }}
      >
        🇬🇧
      </button>
    </div>
  );
}