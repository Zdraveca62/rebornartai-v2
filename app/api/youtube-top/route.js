// app/api/youtube-top/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (type === 'songs') {
      // За песни – филтрираме по item_type
      let query = supabase
        .from('youtube_cache')
        .select('youtube_id, title, views')
        .eq('item_type', 'song');
      const { data, error } = await query.order('views', { ascending: false }).limit(limit);
      if (error) throw error;
      return NextResponse.json({ success: true, videos: data });
    } 
    else if (type === 'videos') {
      // 1. Вземаме списък с youtube_id от таблица videos (с филтър по категория)
      let query = supabase.from('videos').select('youtube_id, title');
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      const { data: videosList, error: videosError } = await query;
      if (videosError) throw videosError;

      if (!videosList || videosList.length === 0) {
        return NextResponse.json({ success: true, videos: [] });
      }

      const ids = videosList.map(v => v.youtube_id);
      // 2. Вземаме гледанията от youtube_cache
      const { data: cache, error: cacheError } = await supabase
        .from('youtube_cache')
        .select('youtube_id, title, views')
        .in('youtube_id', ids);
      if (cacheError) throw cacheError;

      // 3. Обединяваме и сортираме
      const merged = videosList.map(v => {
        const cached = cache.find(c => c.youtube_id === v.youtube_id);
        return {
          youtube_id: v.youtube_id,
          title: v.title || cached?.title || 'Без заглавие',
          views: cached?.views || 0,
        };
      });
      merged.sort((a, b) => b.views - a.views);
      const top = merged.slice(0, limit);
      return NextResponse.json({ success: true, videos: top });
    }
    else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }
  } catch (err) {
    console.error('API /youtube-top грешка:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}