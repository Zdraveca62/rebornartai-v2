import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'songs';
    const limit = parseInt(searchParams.get('limit') || '5');

    let query = supabase.from('youtube_cache').select('youtube_id, title, views');
    if (type === 'songs') query = query.eq('item_type', 'song');
    else if (type === 'videos') query = query.eq('item_type', 'video');

    const { data, error } = await query.order('views', { ascending: false }).limit(limit);
    if (error) throw error;

    return NextResponse.json({ success: true, videos: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}