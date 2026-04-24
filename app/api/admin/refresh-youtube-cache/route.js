// app/api/admin/refresh-youtube-cache/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function POST() {
  try {
    // 1. Вземи всички youtube_id от youtube_cache
    const { data: records, error } = await supabase
      .from('youtube_cache')
      .select('youtube_id');
    if (error) throw error;

    const ids = records.map(r => r.youtube_id).filter(id => id);
    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Няма записи за обновяване' });
    }

    // 2. Заяви гледанията от YouTube API
    const url = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${ids.join(',')}&part=statistics`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) {
      return NextResponse.json({ success: false, error: 'YouTube API не върна данни', details: data });
    }

    // 3. Обнови views в youtube_cache
    for (const item of data.items) {
      const views = parseInt(item.statistics.viewCount, 10);
      await supabase
        .from('youtube_cache')
        .update({ views, last_updated: new Date().toISOString() })
        .eq('youtube_id', item.id);
    }

    return NextResponse.json({ success: true, message: `Обновени ${data.items.length} записа` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}