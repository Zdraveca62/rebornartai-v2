// app/api/songs/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — взима всички песни (JOIN с youtube_cache за views/duration/thumbnail)
export async function GET() {
  try {
    const res = await query(`
      SELECT
        m.id,
        m.youtube_id,
        m.title,
        m.language,
        m.lyrics,
        m.is_active,
        m.created_at,
        yc.views           AS youtube_views,
        yc.thumbnail_url,
        yc.duration_seconds,
        yc.last_updated    AS cache_updated_at
      FROM music2 m
      LEFT JOIN youtube_cache yc ON yc.youtube_id = m.youtube_id
      WHERE m.is_active = true
      ORDER BY m.id ASC
    `)
    return NextResponse.json(res.rows)

  } catch (err) {
    console.error('songs GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — добавя нова песен (само от admin)
export async function POST(request) {
  try {
    const body = await request.json()
    const { title, youtubeId, lyrics, language } = body

    if (!title || !youtubeId || !language) {
      return NextResponse.json(
        { error: 'Липсват задължителни полета: title, youtubeId, language' },
        { status: 400 }
      )
    }

    // Първо upsert в youtube_cache (за да съществува записа)
    const coverUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    await query(
      `INSERT INTO youtube_cache (youtube_id, title, thumbnail_url, item_type)
       VALUES ($1, $2, $3, 'song')
       ON CONFLICT (youtube_id) DO NOTHING`,
      [youtubeId.trim(), title.trim(), coverUrl]
    )

    // После insert в music2
    const res = await query(
      `INSERT INTO music2 (youtube_id, title, language, lyrics)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (youtube_id) DO NOTHING
       RETURNING *`,
      [youtubeId.trim(), title.trim(), language.trim(), lyrics ?? null]
    )

    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: 'youtube_id вече съществува' },
        { status: 409 }
      )
    }

    return NextResponse.json(res.rows[0])

  } catch (err) {
    console.error('songs POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — изтрива песен по id
export async function DELETE(request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Липсва id' }, { status: 400 })
    }

    const res = await query(
      `DELETE FROM music2 WHERE id = $1 RETURNING id`,
      [id]
    )

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Песента не е намерена' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deleted_id: id })

  } catch (err) {
    console.error('songs DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
