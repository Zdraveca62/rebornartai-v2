'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23888' font-size='20'%3E?%3C/text%3E%3C/svg%3E";

export default function TopSongsBlocks({ type = 'songs', category = null }) {
  const [topSite, setTopSite] = useState([]);
  const [topYouTube, setTopYouTube] = useState([]);
  const [loading, setLoading] = useState(true);

  // Син панел
  useEffect(() => {
    if (type === 'videos') {
      const fetchVideosForBlue = async () => {
        try {
          let query = supabase.from('videos').select('youtube_id, title');
          if (category && category !== 'all') {
            query = query.eq('category', category);
          }
          const { data: videosList, error: errVideos } = await query;
          if (errVideos) throw errVideos;
          if (!videosList || videosList.length === 0) {
            setTopSite([]);
            return;
          }
          const ids = videosList.map(v => v.youtube_id);
          const { data: viewsData, error: errViews } = await supabase
            .from('youtube_cache')
            .select('youtube_id, views')
            .in('youtube_id', ids);
          if (errViews) throw errViews;
          const merged = videosList.map(v => {
            const viewsObj = viewsData?.find(c => c.youtube_id === v.youtube_id);
            return {
              youtube_id: v.youtube_id,
              title: v.title || 'Без заглавие',
              view_count: viewsObj ? viewsObj.views : 0,
            };
          });
          merged.sort((a, b) => b.view_count - a.view_count);
          const top5 = merged.slice(0, 5);
          const formatted = top5.map((item, idx) => ({
            id: idx,
            song_title: item.title,
            youtube_id: item.youtube_id,
            listen_count: item.view_count,
            song_language: 'video',
          }));
          setTopSite(formatted);
        } catch (err) {
          console.error('Грешка в синия панел за видеа:', err);
          setTopSite([]);
        }
      };
      fetchVideosForBlue();
    } else {
      fetch('/api/jukebox-stats')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.topSite) setTopSite(data.topSite.slice(0, 5));
        })
        .catch(err => console.error('Грешка при зареждане на топSite:', err));
    }
  }, [type, category]);

  // Червен панел
  useEffect(() => {
    let url = `/api/youtube-top?type=${type}`;
    if (category && category !== 'all') url += `&category=${category}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.videos) setTopYouTube(data.videos);
        else setTopYouTube([]);
      })
      .catch(err => console.error('Грешка при червения панел:', err))
      .finally(() => setLoading(false));
  }, [type, category]);

  const getThumbnail = (item) => {
    const youtubeId = item.youtube_id || item.id;
    if (!youtubeId) return PLACEHOLDER_IMG;
    return `/images/thumbnails/${youtubeId}.jpg`;
  };

  if (loading) {
    return ( <div style={{maxWidth:'1200px',margin:'0 auto',padding:'1rem'}}> <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px,1fr))',gap:'1.5rem'}}> <div style={{background:'#2e1065',borderRadius:'20px',padding:'1rem',textAlign:'center'}}><p style={{color:'#a855f7'}}>ЗАРЕЖДАНЕ...</p></div> </div> </div> );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* ЧЕРВЕН ПАНЕЛ */}
        <div style={{ background: 'radial-gradient(circle at 20% 30%, #3b0764, #1e1b4b)', 
                      borderRadius: '20px', 
                      padding: '1rem 1.2rem', 
                      border: '1px solid rgba(168,85,247,0.4)' }}>
          <h2 style={{ color: '#d8b4fe', 
                       textAlign: 'left', 
                       marginBottom: '0.2rem', 
                       fontSize: '1.3rem', 
                       textTransform: 'uppercase' }}>TOP 5 YOUTUBE</h2>
          <p style={{ color: '#b77eec', 
                      textAlign: 'left', 
                      marginBottom: '1rem', 
                      fontSize: '0.7rem', 
                      textTransform: 'uppercase' }}>MOST VIEWED</p>
          {topYouTube.length === 0 ? (
            <p style={{ color: '#b77eec', 
                        textAlign: 'center', 
                        textTransform: 'uppercase' }}>НЯМА ДАННИ</p>
          ) : (
            topYouTube.map((item, idx) => (
              <a key={item.youtube_id || idx} href={item.videoUrl || `https://youtube.com/watch?v=${item.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  <span style={{ color: '#c084fc', fontWeight: 'bold', minWidth: '28px', textTransform: 'uppercase' }}>#{idx+1}</span>
                  <img src={getThumbnail(item)} alt={item.title} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} onError={(e) => { const yid = item.youtube_id; e.target.src = `https://img.youtube.com/vi/${yid}/mqdefault.jpg`; }} />
                  <div style={{ flex: 1 }}><div style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase' }}>{item.title?.substring(0,28)}</div><div style={{ color: '#a855f7', fontSize: '0.65rem', textTransform: 'uppercase' }}>{item.views?.toLocaleString()} гледания</div></div>
                </div>
              </a>
            ))
          )}
        </div>

        {/* СИН ПАНЕЛ */}
        <div style={{ 
          background: 'radial-gradient(circle at 80% 30%, #3b0764, #1e1b4b)', 
          borderRadius: '20px', padding: '1rem 1.2rem', 
          border: '1px solid rgba(168,85,247,0.4)' }}>
          <h2 style={{ color: '#d8b4fe', textAlign: 'right', marginBottom: '0.2rem', fontSize: '1.3rem', textTransform: 'uppercase' }}>{type === 'videos' ? 'TOP 5 VIDEOS' : 'TOP 5 SITE'}</h2>
          <p style={{ color: '#a855f7', textAlign: 'right', marginBottom: '1rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>{type === 'videos' ? 'MOST VIEWED' : 'MOST PLAYED'}</p>
          {topSite.length === 0 ? (
            <p style={{ color: '#a855f7', textAlign: 'center', textTransform: 'uppercase' }}>{type === 'videos' ? 'НЯМА ВИДЕА' : 'НЯМА СЛУШАНИЯ'}</p>
          ) : (
            topSite.map((item, idx) => (
              <a key={item.id || idx} href={`https://youtube.com/watch?v=${item.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  <img src={getThumbnail(item)} alt={item.song_title} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} onError={(e) => { if(item.youtube_id) e.target.src = `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`; else e.target.src = PLACEHOLDER_IMG; }} />
                  <div style={{ flex: 1, textAlign: 'right' }}><div style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase' }}>{item.song_title?.substring(0,24)}</div><div style={{ color: '#a855f7', fontSize: '0.65rem', textTransform: 'uppercase' }}>{type === 'videos' ? `🎬 ${item.listen_count?.toLocaleString()} гледания` : `${item.song_language === 'bg' ? '🇧🇬 БЪЛГ' : '🇬🇧 EN'} • 🎵 ${item.listen_count}`}</div></div>
                  <span style={{ color: '#c084fc', fontWeight: 'bold', minWidth: '28px', textAlign: 'right', textTransform: 'uppercase' }}>#{idx+1}</span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}