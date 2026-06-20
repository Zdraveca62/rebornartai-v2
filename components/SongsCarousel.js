'use client';

import { useRef, useState, useEffect } from 'react';

export default function SongsCarousel({ songs = [], onSongClick, openYoutube = false }) {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const truncateText = (text, maxLength = 12) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

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
  }, [songs]);

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

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>

      {/* Бутон Ляво */}
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
        {songs.map((song) => {
          const content = (
            <>
              <div style={{
                width: '30px',
                height: '80px',
                backgroundColor: '#bfdbfe',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#1e3a8a',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center center',
                  width: '80px',
                  textAlign: 'center'
                }}>
                  {truncateText(song.title, 12)}
                </span>
              </div>
              <img
                src={
                  song.cover_url ||
                  (song.youtube_id
                    ? `https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`
                    : 'https://via.placeholder.com/50')
                }
                alt={song.title}
                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                onError={(e) => (e.target.src = 'https://via.placeholder.com/50')}
              />
            </>
          );

          const sharedStyle = {
            flex: '0 0 auto',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          };

          if (openYoutube) {
            return (
              <a
                key={song.id}
                href={`https://youtube.com/watch?v=${song.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...sharedStyle, textDecoration: 'none' }}
                onClick={() => onSongClick && onSongClick(song)}
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={song.id}
              style={sharedStyle}
              onClick={() => onSongClick && onSongClick(song)}
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Бутон Дясно */}
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
  );
}