// Redirect към /api/youtube-top
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type  = searchParams.get('type') || 'songs'
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    const res = await query(
      `SELECT youtube_id, title, views, thumbnail_url
       FROM youtube_cache
       WHERE item_type = $1
       ORDER BY views DESC
       LIMIT $2`,
      [type === 'songs' ? 'song' : 'video', limit]
    )

    return NextResponse.json({ success: true, videos: res.rows })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
