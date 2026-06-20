'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import IPGreeting from '../../components/IPGreeting';

export default function Home() {
  const t = useTranslations('home');
  const locale = useLocale();
  const containerRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = window.innerHeight;
      const section = Math.round(scrollTop / sectionHeight);
      setCurrentSection(section);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToNext = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  const cards = [
    {
      href: `/${locale}/ai-music`,
      image: '/images/cards/AiMusicCard.png',
      border: 'rgba(139, 92, 246, 0.5)',
      title: 'AI Music',
      desc: t('musicSub'),
    },
    {
      href: `/${locale}/ai-videos`,
      image: '/images/cards/AiVideosCard.png',
      border: 'rgba(236, 72, 153, 0.5)',
      title: 'AI Videos',
      desc: t('videoSub'),
    },
    {
      href: `/${locale}/blog`,
      image: '/images/cards/BlogCard@2x.png',
      border: 'rgba(245, 158, 11, 0.5)',
      title: 'AI Blog',
      desc: t('blogSub'),
    },
    {
      href: `/${locale}/jukebox`,
      image: '/images/cards/JukeboxCard.png',
      border: 'rgba(16, 185, 129, 0.5)',
      title: 'Jukebox',
      desc: t('jukeboxSub'),
    },
    {
      href: `/${locale}/ai-videos/Clients`,
      image: '/images/cards/CkientsCard.png',
      border: 'rgba(245, 158, 11, 0.5)',
      title: 'Client Orders',
      desc: t('clientsSub'),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-link:hover > div {
          transform: scale(1.04);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          height: '100vh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
        }}
      >
        <IPGreeting />

        {/* СЕКЦИЯ 1 — Заглавна */}
        <div style={{
          height: '100vh',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          backgroundImage: 'url(/images/backgrounds/HomeBg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'relative',
          paddingBottom: '5vh',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />

          <div
            onClick={scrollToNext}
            style={{
              position: 'relative', zIndex: 2,
              color: '#a57ea6', fontSize: '1.2rem',
              animation: 'bounce 2s infinite',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '0.3rem',
            }}
          >
            <span>↓</span>
            <span>{t('scrollDown')}</span>
          </div>
        </div>

        {/* СЕКЦИЯ 2 — Плочки */}
        <div style={{
          height: '100vh',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          backgroundImage: 'url(/images/backgrounds/Home2Bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            maxWidth: '80rem',
            width: '100%',
            margin: '0 auto',
          }}>
            {cards.map((card) => (
              <Link key={card.href} href={card.href} className="card-link" style={{ textDecoration: 'none' }}>
                <div style={{
                  backgroundImage: `url(${card.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `1px solid ${card.border}`,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: '16px',
                  }} />
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#e9d5ff', marginBottom: '0.25rem' }}>
                      {card.title}
                    </h3>
                    <p style={{ color: '#c4b5d4', fontSize: '0.9rem' }}>{card.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}