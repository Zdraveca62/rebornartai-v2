// app/api/jukebox-stats/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('jukebox_stats')
      .select('*')
      .order('listen_count', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Supabase SELECT error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, topSite: data || [] });
  } catch (error) {
    console.error('GET /api/jukebox-stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message, topSite: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { songId, songTitle, songLanguage, item_type, youtubeId } = body;

    if (!songId) {
      return NextResponse.json(
        { success: false, error: 'Missing songId' },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabase
      .from('jukebox_stats')
      .select('id, listen_count')
      .eq('song_id', songId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      // Обновяване на съществуващ запис
      const { error: updateError } = await supabase
        .from('jukebox_stats')
        .update({
          listen_count: existing.listen_count + 1,
          last_listened: new Date().toISOString(),
          song_title: songTitle,
          song_language: songLanguage || 'bg',
          ...(youtubeId && { youtube_id: youtubeId })
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Създаване на нов запис
      const { error: insertError } = await supabase
        .from('jukebox_stats')
        .insert({
          song_id: songId,
          song_title: songTitle,
          song_language: songLanguage || 'bg',
          item_type: item_type || 'song',
          youtube_id: youtubeId || null,
          listen_count: 1,
          last_listened: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/jukebox-stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}