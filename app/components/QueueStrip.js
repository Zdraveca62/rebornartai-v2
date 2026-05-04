'use client';

export default function QueueStrip({ queue = [], currentIndex = 0, onMoveUp, onMoveDown, onRemove }) {

  const truncateText = (text, maxLength = 12) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>

      {/* Лентата с избраните песни */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '1rem',
        padding: '1rem',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '16px',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        justifyContent: 'center',
        flexWrap: 'wrap',
        minHeight: '160px',
        alignItems: 'center'
      }}>

        {/* Празно съобщение */}
        {queue.length === 0 && (
          <p style={{ color: '#9ca3af', textAlign: 'center', width: '100%' }}>
            Кликни върху песен от Карусела, за да я добавиш тук
          </p>
        )}

        {/* Песните в опашката */}
        {queue.map((song, idx) => (
          <div
            key={idx}
            style={{
              flex: '0 0 auto',
              textAlign: 'center',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: currentIndex === idx ? 'rgba(139,92,246,0.2)' : 'transparent',
              borderRadius: '8px',
              padding: '8px'
            }}
          >
            {/* Вертикален етикет */}
            <div style={{
              width: '30px',
              height: '80px',
              backgroundColor: currentIndex === idx ? '#8b5cf6' : '#bfdbfe',
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
                color: currentIndex === idx ? 'white' : '#1e3a8a',
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

            {/* Тъмбнейл */}
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

            {/* Индикатор за текуща песен */}
            {currentIndex === idx && (
              <div style={{ fontSize: '1.2rem', marginTop: '4px' }}>▼</div>
            )}

            {/* Бутони за управление */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
              <button
                onClick={() => onMoveUp && onMoveUp(idx)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
              >↑</button>
              <button
                onClick={() => onMoveDown && onMoveDown(idx)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
              >↓</button>
              <button
                onClick={() => onRemove && onRemove(idx)}
                style={{ background: 'rgba(255,0,0,0.3)', border: 'none', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
              >✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}