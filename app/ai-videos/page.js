'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VideoTopBlocks from '@/app/components/VideoTopBlocks';

export default function AIVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Грешка при зареждане на видеа:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'impressions',  route: 'Impressions',  color: '#8b5cf6', icon: '🎥', thumb: '/images/cards/ImpressionsCard.png' },
    { id: 'musicvideos',  route: 'MusicVideos',  color: '#ec4899', icon: '🎵', thumb: '/images/cards/musicvideos-card.png' },
    { id: 'animations',   route: 'Animations',   color: '#14b8a6', icon: '✨', thumb: '/images/cards/AnimationCard.png' },
    { id: 'clients',      route: 'Clients',      color: '#f59e0b', icon: '🤝', thumb: '/images/cards/CkientsCard.png' },
  ];

  const getVideoCount = (categoryId) =>
    videos.filter(v => v.category === categoryId).length;

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/images/backgrounds/AiVideosBg.png) center/cover fixed',
      padding: '2rem 1rem 4rem',
    }}>

      {/* Назад бутон */}
      <Link href="/">
        <button style={{
          position: 'fixed', top: '1rem', left: '1rem',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)', color: 'white',
          padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10,
          fontSize: '0.9rem',
        }}>
          ← Назад
        </button>
      </Link>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Топ 5 блокове */}
        <div style={{ marginTop: '15rem', marginBottom: '2.5rem' }}>
          {loading ? (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>Зареждане...</p>
          ) : (
            <VideoTopBlocks videos={videos} selectedCategory={selectedCategory} />
          )}
        </div>

        {/* Категории */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {categories.map(category => {
            const count = getVideoCount(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                style={{
                  background: isSelected
                    ? `${category.color}22`
                    : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  padding: '2rem 1.5rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: `2px solid ${isSelected ? category.color : category.color + '55'}`,
                  transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = `0 8px 28px ${category.color}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Тъмбнайл */}
                <div style={{
                  width: '100%',
                  height: '120px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginBottom: '0.25rem',
                  border: `1px solid ${category.color}55`,
                }}>
                  <img
                    src={category.thumb}
                    alt={category.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  {category.title}
                </h2>
                <p style={{
                  color: count > 0 ? category.color : '#6b7280',
                  fontSize: '0.95rem', fontWeight: '600', margin: 0,
                }}>
                  {count > 0 ? `🎬 Налични видеа: ${count}` : '❌ Няма добавено видео'}
                </p>
                {isSelected && (
                  <span style={{
                    marginTop: '0.3rem', fontSize: '0.75rem',
                    color: category.color, fontWeight: 'bold',
                  }}>
                    ▲ Топ 5 по-горе
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Линкове към подкатегориите */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem',
        }}>
          {categories.map(category => (
            <Link key={category.id} href={`/ai-videos/${category.route}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${category.color}33`,
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: category.color,
                textAlign: 'center',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = `${category.color}18`}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                → Разгледай {category.title}
              </div>
            </Link>
          ))}
        </div>

        <p style={{ color: '#d777d6', marginTop: '2.5rem', textAlign: 'center', fontSize: '2rem' }}>
          ⚡ Кликни върху категория за Топ 5 само от нея • Кликни "Разгледай" за всички видеа
        </p>
      </div>
    </div>
  );
}
