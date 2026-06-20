'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VideoTopBlocks from '@/components/VideoTopBlocks';
import VideosCarousel from '@/components/VideosCarousel';

export default function MusicVideos() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetch('/api/videos?category=musicvideos')
      .then(r => r.json())
      .then(data => setVideos(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div>
      <Link href="/">
        <button style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ← Назад
        </button>
      </Link>

      <div style={{ minHeight: '100vh', background: 'url(/images/backgrounds/MusicVideosBg.png) top/cover fixed', padding: '6rem 2rem 4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginTop:'15rem' }}>
          <VideoTopBlocks category="musicvideos" />
          <VideosCarousel videos={videos} />
        </div>
      </div>
    </div>
  );
}
