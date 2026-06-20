'use client';

import { useState, useRef, useEffect } from 'react';

export default function MusicCarousel({ songs = [] }) {
  const [filter, setFilter] = useState('all');
  const [modalSong, setModalSong] = useState(null);
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const filteredSongs = songs.filter(song => {
    if (filter === 'bg') return song.language === 'bg';
    if (filter === 'en') return song.language === 'en';
    return true;
  });

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
  }, [filteredSongs]);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 200;
      const newScrollPosition =
        carouselRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      carouselRef.current.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const trackPlay = (song) => {
    fetch('/api/jukebox-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: song.id,
        songTitle: song.title,
        songLanguage: song.language || 'bg',
        item_type: 'song',
        category: 'music',
        youtubeId: song.youtube_id
      })
    }).catch(err => console.error('Грешка при отчитане:', err));
  };

  return (
    <div style={{ marginBottom: '2rem' }}>

      {/* Филтър бутони */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
            border: 'none', color: 'white', padding: '0.5rem 1.2rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🎵 All Songs
        </button>
        <button
          onClick={() => setFilter('bg')}
          style={{
            background: filter === 'bg' ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
            border: 'none', color: 'white', padding: '0.5rem 1.2rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🇧🇬 Songs BG
        </button>
        <button
          onClick={() => setFilter('en')}
          style={{
            background: filter === 'en' ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
            border: 'none', color: 'white', padding: '0.5rem 1.2rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🇬🇧 Songs EN
        </button>
      </div>

      {/* Карусел със стрелки */}
      <div style={{ position: 'relative' }}>

        {/* Стрелка Ляво */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          style={{
            position: 'absolute',
            left: '-20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollLeft ? 'pointer' : 'not-allowed',
            opacity: canScrollLeft ? 1 : 0.4,
            color: 'white'
          }}
        >
          ◀
        </button>

        {/* Лентата с песните */}
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
          {filteredSongs.map(song => (
            <div key={song.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100px',
            }}>
              {/* Заглавие хоризонтално */}
              <p style={{
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: '6px',
                width: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {song.title}
              </p>

              {/* Тъмбнейл */}
              <img
                src={`/images/thumbnails/${song.youtube_id}.jpg`}
                alt={song.title}
                style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }}
                onError={(e) => (e.target.src = `https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`)}
              />

              {/* Бутони */}
              <div style={{ display: 'flex', gap: '4px' }}>
                
               <a   href={`https://youtube.com/watch?v=${song.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackPlay(song)}
                  style={{
                    background: '#8b5cf6',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  ▶ Плей
                </a>
                <button
                  onClick={() => setModalSong(song)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📄 Lyrics
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
            position: 'absolute',
            right: '-20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollRight ? 'pointer' : 'not-allowed',
            opacity: canScrollRight ? 1 : 0.4,
            color: 'white'
          }}
        >
          ▶
        </button>
      </div>

      {/* Модален прозорец с лирики */}
      {modalSong && (
        <div
          onClick={() => setModalSong(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '1rem' }}>
              🎵 {modalSong.title}
            </h2>
            <pre style={{
              color: 'white',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              lineHeight: '1.8',
              fontSize: '14px'
            }}>
              {modalSong.lyrics || 'Няма текст за тази песен.'}
            </pre>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => setModalSong(null)}
                style={{
                  background: '#8b5cf6',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
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