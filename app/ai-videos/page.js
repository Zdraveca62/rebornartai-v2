'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopSongsBlocks from '@/app/components/TopSongsBlocks';

export default function AIVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data);
      setLoading(false);
    } catch (error) {
      console.error('Грешка при зареждане на видеа:', error);
      setLoading(false);
    }
  };

  const categories = [
    { id: 'Impressions', title: 'Видео Импресии', color: '#8b5cf6' },
    { id: 'MusicVideos', title: 'Музикални видеа', color: '#ec4899' },
    { id: 'Animations', title: 'Анимации', color: '#14b8a6' },
    { id: 'Clients', title: 'Видео - Клиенти', color: '#f59e0b' }
  ];

  const getVideoCount = (categoryId) => {
    return videos.filter(v => v.category === categoryId).length;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'url(images/backgrounds/AiVideosBg.png)', padding: '18rem'}}>
      
      <Link href="/">
        <button style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ← Назад
        </button>
      </Link>

      <div style={{ maxWidth: '1200px', margin: '0 auto 2rem auto' }}>
        <TopSongsBlocks type="videos" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', width: '100%' }}>
        
        {categories.map(category => {
          const count = getVideoCount(category.id);
          const hasVideos = count > 0;
          
          
          return (
            <Link key={category.id} href={`/ai-videos/${category.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '2rem',
                cursor: 'pointer',
                textAlign: 'center',
                border: `1px solid ${category.color}`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{category.icon}</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                  {category.title}
                </h2>
                <p style={{ color: hasVideos ? category.color : '#9ca3af', fontSize: '1rem', fontWeight: 'bold', marginTop: '1rem' }}>
                  {hasVideos ? `🎬 Налични видеа: ${count}` : '❌ Няма добавено видео'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      
      <p style={{ color: '#9ca3af', marginTop: '3rem', textAlign: 'center', fontSize: '0.875rem' }}>
        ⚡ Кликни върху категория, за да разгледаш видеата
      </p>
    </div>
  );
}