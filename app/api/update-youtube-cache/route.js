// app/api/update-youtube-cache/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET() {
  try {
    const { data: songs } = await supabase
      .from('music2')
      .select('youtube_id, title');

    const { data: videos } = await supabase
      .from('videos')
      .select('youtube_id, title');

    const allItems = [
      ...(songs || []).map(s => ({ ...s, item_type: 'song' })),
      ...(videos || []).map(v => ({ ...v, item_type: 'video' }))
    ];

    if (allItems.length === 0) {
      return NextResponse.json({ success: true, message: 'Няма елементи за обновяване' });
    }

    const chunks = [];
    for (let i = 0; i < allItems.length; i += 50) {
      chunks.push(allItems.slice(i, i + 50));
    }

    let totalUpdated = 0;

    for (const chunk of chunks) {
      const ids = chunk.map(item => item.youtube_id).join(',');
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${YOUTUBE_API_KEY}`
      );
      
      const ytData = await response.json();
      if (!ytData.items) continue;

      for (const ytItem of ytData.items) {
        const views = parseInt(ytItem.statistics?.viewCount || 0);
        const localItem = chunk.find(i => i.youtube_id === ytItem.id);
        if (!localItem) continue;

        const { error } = await supabase
          .from('youtube_cache')
          .upsert({
            youtube_id: ytItem.id,
            title: localItem.title,
            views: views,
            item_type: localItem.item_type,
            thumbnail_url: `https://img.youtube.com/vi/${ytItem.id}/mqdefault.jpg`,
            last_updated: new Date().toISOString()
          }, { onConflict: 'youtube_id' });

        if (error) {
          console.error('Грешка при upsert:', ytItem.id, error);
        } else {
          totalUpdated++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Обновени ${totalUpdated} записа`,
      updated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('Грешка при обновяване:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}