import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { videoId } = await request.json();
    if (!videoId) return Response.json({ error: 'Липсва videoId' }, { status: 400 });

    const { data: video, error: fetchErr } = await supabase
      .from('videos')
      .select('site_views')
      .eq('id', videoId)
      .single();

    if (fetchErr) throw fetchErr;

    const { error: updateErr } = await supabase
      .from('videos')
      .update({ site_views: (video.site_views || 0) + 1 })
      .eq('id', videoId);

    if (updateErr) throw updateErr;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Грешка track-view:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
