// app/api/jukebox-stats/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — Топ 5 най-слушани в джубокса
export async function GET() {
  try {
    const res = await query(`
      SELECT
        js.id,
        js.youtube_id,
        js.item_type,
        js.listen_count,
        js.last_listened,
        yc.title,
        yc.thumbnail_url
      FROM jukebox_stats js
      LEFT JOIN youtube_cache yc ON yc.youtube_id = js.youtube_id
      ORDER BY js.listen_count DESC
      LIMIT 5
    `)
    return NextResponse.json({ success: true, topSite: res.rows })
  } catch (err) {
    console.error('GET /api/jukebox-stats error:', err)
    return NextResponse.json({ success: false, error: err.message, topSite: [] }, { status: 500 })
  }
}

// POST — записва/обновява listen_count по youtube_id
export async function POST(request) {
  try {
    const body = await request.json()
    const { youtubeId, itemType } = body

    if (!youtubeId) {
      return NextResponse.json({ success: false, error: 'Липсва youtubeId' }, { status: 400 })
    }

    // Атомарен upsert — ако съществува increment, ако не — insert
    await query(
      `INSERT INTO jukebox_stats (youtube_id, item_type, listen_count, last_listened)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (youtube_id) DO UPDATE SET
         listen_count  = jukebox_stats.listen_count + 1,
         last_listened = NOW(),
         updated_at    = NOW()`,
      [youtubeId, itemType ?? 'song']
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/jukebox-stats error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
