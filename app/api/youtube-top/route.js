import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
   console.log('🔍 API /youtube-top извикан');
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'songs' или 'videos'

    let query = supabase.from('youtube_cache').select('*').order('views', { ascending: false });

    if (type === 'songs') {
      query = query.eq('item_type', 'song');
    } else if (type === 'videos') {
      query = query.eq('item_type', 'video');
    }

    const { data, error } = await query.limit(5);
    console.log('📊 Данни от Supabase:', data);
    if (error) throw error;

    const videos = (data || []).map(v => ({
      id: v.youtube_id,
      title: v.title,
      thumbnail: v.thumbnail_url,
      views: v.views,
      videoUrl: `https://www.youtube.com/watch?v=${v.youtube_id}`,
      item_type: v.item_type,
      category: v.category
    }));

    return NextResponse.json({ success: true, videos });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, videos: [] }, { status: 500 });
  }
}