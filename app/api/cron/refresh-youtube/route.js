// app/api/cron/refresh-youtube/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET; // ще сложим тайна в .env.local

async function fetchYouTubeViews(videoIds) {
  if (!YOUTUBE_API_KEY) return {};
  const url = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds.join(',')}&part=statistics`;
  const res = await fetch(url);
  const data = await res.json();
  const viewsMap = {};
  if (data.items) {
    data.items.forEach(item => {
      viewsMap[item.id] = parseInt(item.statistics.viewCount, 10);
    });
  }
  return viewsMap;
}

export async function GET(request) {
  // Проверка за тайна (за да не може всеки да вика този endpoint)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: existing } = await supabase
      .from('youtube_cache')
      .select('youtube_id');
    const videoIds = existing.map(item => item.youtube_id).filter(Boolean);
    if (videoIds.length === 0) throw new Error('Няма ID-та');

    const viewsMap = await fetchYouTubeViews(videoIds);

    for (const videoId of videoIds) {
      const views = viewsMap[videoId] || 0;
      await supabase
        .from('youtube_cache')
        .update({ views, last_updated: new Date().toISOString() })
        .eq('youtube_id', videoId);
    }

    return NextResponse.json({ success: true, updated: videoIds.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}