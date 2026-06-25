'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopSongsBlocks from '@/components/TopSongsBlocks';
import MusicCarousel from '@/components/MusicCarousel';

export default function AIMusic() {
  const [allSongs, setAllSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => {
        const songs = Array.isArray(data) ? data : [];
        setAllSongs(songs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Грешка при зареждане:', err);
        setAllSongs([]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Link href="/">
        <button style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ← Назад
        </button>
      </Link>

      <div style={{ minHeight: '100vh',
                    background: 'url(images/backgrounds/AiMusicBg.png) top/cover fixed ', 
                    padding: '15rem 2rem 4rem' }}>
        <TopSongsBlocks item_type="song" />

        {!loading && <MusicCarousel songs={allSongs} />}
      </div>
    </div>
  );
}