// app/api/videos/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category    = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')

    // JOIN с youtube_cache за да вземем views, thumbnail и duration_seconds
    let sql = `
      SELECT
        v.id,
        v.youtube_id,
        v.title,
        v.description,
        v.category,
        v.subcategory,
        v.cover_url,
        v.is_active,
        v.created_at,
        yc.views          AS youtube_views,
        yc.thumbnail_url,
        yc.duration_seconds,
        yc.last_updated   AS cache_updated_at
      FROM videos v
      LEFT JOIN youtube_cache yc ON yc.youtube_id = v.youtube_id
      WHERE v.is_active = true
    `
    const params = []

    if (category) {
      params.push(category)
      sql += ` AND v.category = $${params.length}`
    }

    if (subcategory) {
      params.push(subcategory)
      sql += ` AND v.subcategory = $${params.length}`
    }

    sql += ` ORDER BY v.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json(res.rows)

  } catch (err) {
    console.error('videos GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
