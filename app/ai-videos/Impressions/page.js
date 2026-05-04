'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoTopBlocks from '@/app/components/VideoTopBlocks';
import VideosCarousel from '@/app/components/VideosCarousel';

export default function Impressions() {
  const router = useRouter();
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    fetch('/api/videos?category=impressions')
      .then(r => r.json())
      .then(data => setVideos(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div>
      <button
        onClick={() => router.back()}
        style={{ position: 'fixed', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}
      >
        ← Назад
      </button>

      <div style={{ minHeight: '100vh', background: 'url(/images/backgrounds/ImpressionsBg.png) center/cover fixed', padding: '6rem 2rem 4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <VideoTopBlocks category="impressions" />
          <VideosCarousel videos={videos} />
        </div>
      </div>
    </div>
  );
}
