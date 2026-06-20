'use client';

import { useState, useRef, useEffect } from 'react';

export default function VideosCarousel({ videos = [] }) {
  const [modalVideo, setModalVideo] = useState(null);
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [videos]);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 200;
      carouselRef.current.scrollTo({
        left: carouselRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth'
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const trackView = (video) => {
    fetch('/api/videos/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video.id })
    }).catch(err => console.error('Грешка при отчитане:', err));
  };

  if (videos.length === 0) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '1rem',
        marginBottom: '2rem'
      }}>
        🎬 Няма добавени видеа в тази категория
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2rem' }}>

      {/* Карусел със стрелки */}
      <div style={{ position: 'relative' }}>

        {/* Стрелка Ляво */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          style={{
            position: 'absolute', left: '-20px', top: '50%',
            transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: 'none',
            borderRadius: '50%', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canScrollLeft ? 'pointer' : 'not-allowed',
            opacity: canScrollLeft ? 1 : 0.4, color: 'white'
          }}
        >◀</button>

        {/* Лентата с видеата */}
        <div
          ref={carouselRef}
          onScroll={checkScrollButtons}
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'thin',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          {videos.map(video => (
            <div key={video.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', width: '100px',
            }}>
              {/* Заглавие */}
              <p style={{
                color: 'white', fontSize: '11px', fontWeight: '600',
                textAlign: 'center', marginBottom: '6px', width: '100px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {video.title}
              </p>

              {/* Тъмбнайл */}
              <img
                src={`/images/thumbnails/${video.youtube_id}.jpg`}
                alt={video.title}
                style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }}
                onError={(e) => (e.target.src = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`)}
              />

              {/* Бутон Плей */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <a
                  href={`https://youtube.com/watch?v=${video.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackView(video)}
                  style={{
                    background: '#8b5cf6', color: 'white',
                    padding: '3px 8px', borderRadius: '6px',
                    fontSize: '11px', textDecoration: 'none', fontWeight: 'bold'
                  }}
                >
                  ▶ Плей
                </a>
                <button
                  onClick={() => setModalVideo(video)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', color: 'white',
                    border: 'none', padding: '3px 8px', borderRadius: '6px',
                    fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  ℹ️ Инфо
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Стрелка Дясно */}
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          style={{
            position: 'absolute', right: '-20px', top: '50%',
            transform: 'translateY(-50%)', zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: 'none',
            borderRadius: '50%', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canScrollRight ? 'pointer' : 'not-allowed',
            opacity: canScrollRight ? 1 : 0.4, color: 'white'
          }}
        >▶</button>
      </div>

      {/* Модален прозорец с инфо */}
      {modalVideo && (
        <div
          onClick={() => setModalVideo(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
              borderRadius: '16px', padding: '2rem', maxWidth: '600px',
              width: '100%', maxHeight: '80vh', overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <img
              src={`/images/thumbnails/${modalVideo.youtube_id}.jpg`}
              alt={modalVideo.title}
              onError={(e) => (e.target.src = `https://img.youtube.com/vi/${modalVideo.youtube_id}/mqdefault.jpg`)}
              style={{ width: '100%', borderRadius: '10px', marginBottom: '1rem' }}
            />
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '1rem' }}>
              🎬 {modalVideo.title}
            </h2>
            {modalVideo.description && (
              <p style={{ color: '#d1d5db', lineHeight: '1.7', fontSize: '14px', textAlign: 'center' }}>
                {modalVideo.description}
              </p>
            )}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <a
                href={`https://youtube.com/watch?v=${modalVideo.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackView(modalVideo)}
                style={{
                  background: '#ff4444', color: 'white',
                  padding: '0.5rem 1.5rem', borderRadius: '8px',
                  textDecoration: 'none', fontSize: '14px', fontWeight: 'bold'
                }}
              >
                ▶ Гледай в YouTube
              </a>
              <button
                onClick={() => setModalVideo(null)}
                style={{
                  background: '#8b5cf6', border: 'none', color: 'white',
                  padding: '0.5rem 1.5rem', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                ✕ Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
