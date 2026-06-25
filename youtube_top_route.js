// app/api/youtube-top/route.js
// Топ N видеа/песни по YouTube views
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type     = searchParams.get('type')      // 'songs' | 'videos'
    const category = searchParams.get('category')  // за videos: 'impressions', итн.
    const limit    = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    if (type === 'songs') {
      const res = await query(
        `SELECT yc.youtube_id, yc.title, yc.views, yc.thumbnail_url
         FROM youtube_cache yc
         WHERE yc.item_type = 'song'
         ORDER BY yc.views DESC
         LIMIT $1`,
        [limit]
      )
      return NextResponse.json({ success: true, videos: res.rows })
    }

    if (type === 'videos') {
      // JOIN videos + youtube_cache, с опционален филтър по категория
      const params = [limit]
      let categoryClause = ''

      if (category && category !== 'all') {
        params.push(category)
        categoryClause = `AND v.category = $${params.length}`
      }

      const res = await query(
        `SELECT
           v.youtube_id,
           v.title,
           v.category,
           v.subcategory,
           yc.views,
           yc.thumbnail_url
         FROM videos v
         LEFT JOIN youtube_cache yc ON yc.youtube_id = v.youtube_id
         WHERE v.is_active = true ${categoryClause}
         ORDER BY yc.views DESC NULLS LAST
         LIMIT $1`,
        params
      )
      return NextResponse.json({ success: true, videos: res.rows })
    }

    return NextResponse.json({ success: false, error: 'type трябва да е songs или videos' }, { status: 400 })

  } catch (err) {
    console.error('youtube-top error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
