'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react'; 
import TopSongsBlocks from './components/TopSongsBlocks';

export default function Home() {
  const secondSectionRef = useRef(null);
  const [bgImage, setBgImage] = useState('url(/images/backgrounds/HomeBg.png)');

  useEffect(() => {
    const handleScroll = () => {
      if (secondSectionRef.current) {
        const rect = secondSectionRef.current.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2) {
          setBgImage('url(/images/backgrounds/Home2Bg.png)');
        } else {
          setBgImage('url(/images/backgrounds/HomeBg.png)');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return ( 
    <div style={{ 
      minHeight: '100vh',
      backgroundImage: 'url(/images/backgrounds/HomeBg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      transition: 'background-image 0.5s ease-in-out',
      overflowY: 'scroll',
      scrollSnapType: 'y mandatory'
    }}>

    {/* Секция 1: Заглавна */}
      <div style={{
        height: '100vh',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.3)',
        position: 'relative',
        paddingBottom: '5vh'
      }}>
    

          <div style={{ 
          color: '#a57ea6',
          fontSize: '1.2rem', 
          animation: 'bounce 2s infinite',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.05rem',
          marginBottom: '0.05rem'
        }}
        onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}>
          <span>↓</span>
          <span>Плъзни надолу</span>
        </div>
      </div>
          {/* Секция 2: Карти с категории */}
      <div ref={secondSectionRef} style={{
        height: '100vh',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'url(/images/backgrounds/Home2Bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}>
        <h2 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#a57ea6', marginBottom: '0.5rem', textAlign: 'center' }}>
          
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', width: '100%' }}>
          
          <Link href="/ai-music" style={{ textDecoration: 'none' }}>
            <div style={{ 
              backgroundImage: 'url(/images/cards/AiMusicCard.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '16px', 
              padding: '1rem', 
              cursor: 'pointer', 
              textAlign: 'center', 
              border: '1px solid rgba(139, 92, 246, 0.5)', 
              transition: 'transform 0.3s',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a57ea6', marginBottom: '0.1rem' }}>AI Music</h3>
                <p style={{ color: '#a57ea6' }}>Генерирани песни</p>
              </div>
            </div>
          </Link>
          
          <Link href="/ai-videos" style={{ textDecoration: 'none' }}>
            <div style={{ 
              backgroundImage: 'url(/images/cards/AiVideosCard.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '16px', 
              padding: '2rem', 
              cursor: 'pointer', 
              textAlign: 'center', 
              border: '1px solid rgba(236, 72, 153, 0.5)', 
              transition: 'transform 0.3s',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a57ea6', marginBottom: '0.5rem' }}>AI Videos</h3>
                <p style={{ color: '#a57ea6' }}>Видео от AI</p>
              </div>
            </div>
          </Link>
          
          <Link href="/blog" style={{ textDecoration: 'none' }}>
            <div style={{ 
              backgroundImage: 'url(/images/cards/BlogCard@2x.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '16px', 
              padding: '2rem', 
              cursor: 'pointer', 
              textAlign: 'center', 
              border: '1px solid rgba(245, 158, 11, 0.5)', 
              transition: 'transform 0.3s',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a57ea6', marginBottom: '0.5rem' }}>AI Blog</h3>
                <p style={{ color: '#a57ea6' }}>Всичко за AI</p>
              </div>
            </div>
          </Link>
           
          <Link href="/jukebox" style={{ textDecoration: 'none' }}>
            <div style={{ 
              backgroundImage: 'url(/images/cards/JukeboxCard.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '16px', 
              padding: '2rem', 
              cursor: 'pointer', 
              textAlign: 'center', 
              border: '1px solid rgba(16, 185, 129, 0.5)', 
              transition: 'transform 0.3s',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a57ea6', marginBottom: '0.5rem' }}>Jukebox</h3>
                <p style={{ color: '#a57ea6' }}>Непрекъснато слушане</p>
              </div>
            </div>
          </Link>
        </div>
        
        <Link href="/admin" style={{ textDecoration: 'none', position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>Admin</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
