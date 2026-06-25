'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import TopSongsBlocks from '@/components/TopSongsBlocks';
import SongsCarousel from '@/components/SongsCarousel';
import QueueStrip from '@/components/QueueStrip';

export default function Jukebox() {
  const [allSongs, setAllSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [currentIndexInQueue, setCurrentIndexInQueue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const playerRef = useRef(null);
  const queueRef = useRef(queue);
  const timerRef = useRef(null);
  const currentDurationRef = useRef(240000);

  // Синхронизиране на queueRef
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Зареждане на песните - само песни без видеа
useEffect(() => {
  fetch('/api/songs')
    .then(res => {
      console.log('Status:', res.status);
      return res.json();
    })
    .then(data => {
      console.log('Data от API:', data);
      const songs = Array.isArray(data) ? data : data.songs || data.data || [];
      setAllSongs(songs);
      setLoading(false);
    })
    .catch(err => {
      console.error('Грешка при зареждане:', err);
      setAllSongs([]);
      setLoading(false);
    });
}, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    const duration = currentDurationRef.current || 240000;
    timerRef.current = setTimeout(() => {
      playNext();
    }, duration);
  };

  const playNext = () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    setCurrentIndexInQueue(prevIndex => {
      let nextIndex = prevIndex + 1;
      if (nextIndex >= currentQueue.length) nextIndex = 0;
      clearTimer();
      setPlayerKey(p => p + 1);
      return nextIndex;
    });
  };

  const playPrev = () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    setCurrentIndexInQueue(prevIndex => {
      let prevIndexNew = prevIndex - 1;
      if (prevIndexNew < 0) prevIndexNew = currentQueue.length - 1;
      clearTimer();
      setPlayerKey(p => p + 1);
      return prevIndexNew;
    });
  };

const addToQueue = (song) => {
  console.log('🎵 addToQueue извикана за:', song.title);
  fetch('/api/jukebox-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      songId: song.id,
      songTitle: song.title,
      songLanguage: song.language || 'bg',
      item_type: 'song',
      category: 'music',
      youtubeId: song.youtube_id  // добавяме youtube_id
    })
  })
  .then(res => res.json())
  .then(data => console.log('Резултат от API:', data))
  .catch(err => console.error('Грешка:', err));

  setQueue(prev => {
    const newQueue = [...prev, song];
    if (newQueue.length === 1) {
      setCurrentIndexInQueue(0);
      setPlayerKey(p => p + 1);
      setIsPlaying(true);
    }
    return newQueue;
  });
};

  const removeFromQueue = (index) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });
    if (currentIndexInQueue >= index && currentIndexInQueue > 0) {
      setCurrentIndexInQueue(prev => prev - 1);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setQueue(prev => {
      const newQueue = [...prev];
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      return newQueue;
    });
    if (currentIndexInQueue === index) setCurrentIndexInQueue(prev => prev - 1);
    else if (currentIndexInQueue === index - 1) setCurrentIndexInQueue(prev => prev + 1);
  };

  const moveDown = (index) => {
    if (index === queue.length - 1) return;
    setQueue(prev => {
      const newQueue = [...prev];
      [newQueue[index + 1], newQueue[index]] = [newQueue[index], newQueue[index + 1]];
      return newQueue;
    });
    if (currentIndexInQueue === index) setCurrentIndexInQueue(prev => prev + 1);
    else if (currentIndexInQueue === index + 1) setCurrentIndexInQueue(prev => prev - 1);
  };

  // Зареждане на YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setPlayerReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => setPlayerReady(true);
    return () => { delete window.onYouTubeIframeAPIReady; };
  }, []);

  // Създаване на плейъра
useEffect(() => {
  const currentSong = queue[currentIndexInQueue];
  if (!playerReady || !currentSong) return;
  if (playerRef.current && typeof playerRef.current.destroy === 'function') {
    playerRef.current.destroy();
  }
  playerRef.current = new window.YT.Player('youtube-player', {
    height: '200',
    width: '100%',
    videoId: currentSong.youtube_id,
    playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, mute: 0 },
    events: {
      onReady: (event) => {
        const duration = event.target.getDuration();
        currentDurationRef.current = duration > 0 ? duration * 1000 : 240000;
        setTimeout(() => {
          event.target.playVideo();
          setIsPlaying(true);
        }, 500);
      },
      onStateChange: (event) => {
        if (event.data === 1) {
          setIsPlaying(true);
          // startTimer вътре в event handler - без dependency проблем
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setCurrentIndexInQueue(prev => {
              const q = queueRef.current;
              let next = prev + 1;
              if (next >= q.length) next = 0;
              setPlayerKey(p => p + 1);
              return next;
            });
          }, currentDurationRef.current || 240000);
        } else if (event.data === 2) {
          setIsPlaying(false);
          if (timerRef.current) clearTimeout(timerRef.current);
        } else if (event.data === 0) {
          if (timerRef.current) clearTimeout(timerRef.current);
          setCurrentIndexInQueue(prev => {
            const q = queueRef.current;
            let next = prev + 1;
            if (next >= q.length) next = 0;
            setPlayerKey(p => p + 1);
            return next;
          });
        }
      },
      onError: () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setCurrentIndexInQueue(prev => {
          const q = queueRef.current;
          let next = prev + 1;
          if (next >= q.length) next = 0;
          setPlayerKey(p => p + 1);
          return next;
        });
      }
    }
  });
  return () => {
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      playerRef.current.destroy();
    }
  };
}, [playerReady, currentIndexInQueue, playerKey]);
  // Синхронизиране play/pause
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1e1b4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Зареждане на музикалната библиотека...
    </div>
  );

  return (
    <div>
      <Link href="/">
        <button style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ← Назад
        </button>
      </Link>

      <div style={{ minHeight: '100vh', background: 'url(/images/backgrounds/JukeboxBg.png) top/cover fixed', padding: '16rem 1rem 4rem' }}>
        <TopSongsBlocks />

        <p style={{ marginTop: '1rem', marginBottom: '1rem', textAlign: 'center', color: 'white' }}>
          Кликнете върху избрана от вас песен, за да се зареди в Джубокса
        </p>

        <SongsCarousel songs={allSongs} onSongClick={addToQueue} />

        <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.5rem', color: 'white' }}>
          📋 Избрани песни
        </h2>
        <QueueStrip
          queue={queue}
          currentIndex={currentIndexInQueue}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onRemove={removeFromQueue}
        />

        {queue[currentIndexInQueue] && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '600px',
            margin: '2rem auto 0 auto'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'white' }}>
              🎧 {queue[currentIndexInQueue].title}
            </h2>
            <div id="youtube-player" style={{ marginBottom: '1rem' }}></div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => setIsPlaying(false)} style={{ background: '#8b5cf6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>⏸️ Пауза</button>
              <button onClick={() => setIsPlaying(true)} style={{ background: '#8b5cf6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>▶️ Плей</button>
              <button onClick={playNext} style={{ background: '#8b5cf6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>⏩ Напред</button>
              <button onClick={playPrev} style={{ background: '#8b5cf6', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>⏪ Назад</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}