// app/api/videos/track-view/route.js
// Записва гледане на видео в сайта (site_views в youtube_cache)
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request) {
  try {
    const { youtubeId } = await request.json()

    if (!youtubeId) {
      return NextResponse.json({ error: 'Липсва youtubeId' }, { status: 400 })
    }

    // Increment site_views директно в youtube_cache
    const res = await query(
      `UPDATE youtube_cache
       SET views = views + 1,
           last_updated = NOW()
       WHERE youtube_id = $1
       RETURNING views`,
      [youtubeId]
    )

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'youtube_id не е намерен' }, { status: 404 })
    }

    return NextResponse.json({ success: true, views: res.rows[0].views })
  } catch (err) {
    console.error('track-view error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
