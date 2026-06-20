'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23888' font-size='20'%3E?%3C/text%3E%3C/svg%3E";

export default function VideoTopBlocks({ category }) {
  const [topYouTube, setTopYouTube] = useState([]);
  const [topSite, setTopSite] = useState([]);
  const [loading, setLoading] = useState(true);

  // Топ 5 YouTube — от youtube_cache
  useEffect(() => {
    const fetchYouTube = async () => {
      try {
        let query = supabase.from('videos').select('id, title, youtube_id, category');
        if (category) query = query.eq('category', category);
        const { data: videosList, error: errVideos } = await query;
        if (errVideos) throw errVideos;
        if (!videosList || videosList.length === 0) { setTopYouTube([]); return; }

        const ids = videosList.map(v => v.youtube_id);
        const { data: cacheData, error: errCache } = await supabase
          .from('youtube_cache')
          .select('youtube_id, views')
          .in('youtube_id', ids);
        if (errCache) throw errCache;

        const merged = videosList.map(v => {
          const cached = cacheData?.find(c => c.youtube_id === v.youtube_id);
          return { ...v, views: cached?.views || 0 };
        });
        merged.sort((a, b) => b.views - a.views);
        setTopYouTube(merged.slice(0, 5));
      } catch (err) {
        console.error('Грешка YouTube топ:', err);
        setTopYouTube([]);
      }
    };
    fetchYouTube();
  }, [category]);

  // Топ 5 Сайт — от site_views в таблица videos
  useEffect(() => {
    const fetchSite = async () => {
      try {
        let query = supabase
          .from('videos')
          .select('id, title, youtube_id, site_views')
          .order('site_views', { ascending: false })
          .limit(5);
        if (category) query = query.eq('category', category);
        const { data, error } = await query;
        if (error) throw error;
        setTopSite(data || []);
      } catch (err) {
        console.error('Грешка сайт топ:', err);
        setTopSite([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, [category]);

  const getThumbnail = (youtube_id) => {
    if (!youtube_id) return PLACEHOLDER_IMG;
    return `/images/thumbnails/${youtube_id}.jpg`;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#2e1065', borderRadius: '20px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#a855f7' }}>ЗАРЕЖДАНЕ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', marginBottom: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* ЧЕРВЕН ПАНЕЛ — YouTube */}
        <div style={{
          background: 'radial-gradient(circle at 20% 30%, #3b0764, #1e1b4b)',
          borderRadius: '20px', padding: '1rem 1.2rem',
          border: '1px solid rgba(168,85,247,0.4)'
        }}>
          <h2 style={{ color: '#d8b4fe', textAlign: 'left', marginBottom: '0.2rem', fontSize: '1.3rem', textTransform: 'uppercase' }}>
            TOP 5 YOUTUBE
          </h2>
          <p style={{ color: '#b77eec', textAlign: 'left', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
            MOST VIEWED
          </p>
          {topYouTube.length === 0 ? (
            <p style={{ color: '#b77eec', textAlign: 'center', textTransform: 'uppercase' }}>НЯМА ДАННИ</p>
          ) : (
            topYouTube.map((item, idx) => (
              <a key={item.id} href={`https://youtube.com/watch?v=${item.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  <span style={{ color: '#c084fc', fontWeight: 'bold', minWidth: '28px', textTransform: 'uppercase' }}>#{idx + 1}</span>
                  <img
                    src={getThumbnail(item.youtube_id)}
                    alt={item.title}
                    style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }}
                    onError={(e) => { e.target.src = `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', textTransform: 'uppercase' }}>{item.title?.substring(0, 28)}</div>
                    <div style={{ color: '#a855f7', fontSize: '0.75rem', textTransform: 'uppercase' }}>▶ {item.views?.toLocaleString()} гледания</div>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>

        {/* СИН ПАНЕЛ — Сайт */}
        <div style={{
          background: 'radial-gradient(circle at 80% 30%, #3b0764, #1e1b4b)',
          borderRadius: '20px', padding: '1rem 1.2rem',
          border: '1px solid rgba(168,85,247,0.4)'
        }}>
          <h2 style={{ color: '#d8b4fe', textAlign: 'right', marginBottom: '0.2rem', fontSize: '1.3rem', textTransform: 'uppercase' }}>
            TOP 5 VIDEOS
          </h2>
          <p style={{ color: '#a855f7', textAlign: 'right', marginBottom: '1rem', fontSize: '0.9em', textTransform: 'uppercase' }}>
            MOST VIEWED IN SITE
          </p>
          {topSite.length === 0 ? (
            <p style={{ color: '#a855f7', textAlign: 'center', textTransform: 'uppercase' }}>НЯМА ГЛЕДАНИЯ</p>
          ) : (
            topSite.map((item, idx) => (
              <a key={item.id} href={`https://youtube.com/watch?v=${item.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  <img
                    src={getThumbnail(item.youtube_id)}
                    alt={item.title}
                    style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px' }}
                    onError={(e) => { e.target.src = `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`; }}
                  />
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', textTransform: 'uppercase' }}>{item.title?.substring(0, 24)}</div>
                    <div style={{ color: '#a855f7', fontSize: '0.75rem', textTransform: 'uppercase' }}>🎬 {(item.site_views || 0).toLocaleString()} гледания</div>
                  </div>
                  <span style={{ color: '#c084fc', fontWeight: 'bold', minWidth: '28px', textAlign: 'right', textTransform: 'uppercase' }}>#{idx + 1}</span>
                </div>
              </a>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
