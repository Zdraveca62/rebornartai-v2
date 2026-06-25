// app/api/admin/refresh-youtube-cache/route.js
// Извиква се ръчно от admin панела — обновява views + duration от YouTube API
import { NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { requireUser } from '@/lib/session'

function parseISO8601Duration(iso) {
  if (!iso) return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return null
  const hours   = parseInt(match[1] ?? 0)
  const minutes = parseInt(match[2] ?? 0)
  const seconds = parseInt(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}

export async function POST(request) {
  try {
    // Само admin (access_level = 3) може да го извика
    const user = await requireUser(request, 3)
    if (user instanceof NextResponse) return user

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'YOUTUBE_API_KEY не е конфигуриран' }, { status: 500 })
    }

    // Вземаме всички youtube_id от кеша
    const cacheRes = await query(`SELECT youtube_id FROM youtube_cache`)
    const ids = cacheRes.rows.map(r => r.youtube_id).filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'Няма записи за обновяване' })
    }

    // YouTube API — statistics + contentDetails (за duration)
    const url = `https://www.googleapis.com/youtube/v3/videos` +
      `?key=${apiKey}&id=${ids.join(',')}&part=statistics,contentDetails`

    const res  = await fetch(url)
    const data = await res.json()

    if (!data.items) {
      return NextResponse.json({ success: false, error: 'YouTube API не върна данни', details: data })
    }

    await withTransaction(async (client) => {
      for (const item of data.items) {
        const views    = parseInt(item.statistics?.viewCount ?? 0)
        const duration = parseISO8601Duration(item.contentDetails?.duration)

        await client.query(
          `UPDATE youtube_cache
           SET views            = $1,
               duration_seconds = COALESCE($2, duration_seconds),
               last_updated     = NOW()
           WHERE youtube_id = $3`,
          [views, duration, item.id]
        )
      }
    })

    return NextResponse.json({ success: true, message: `Обновени ${data.items.length} записа` })

  } catch (err) {
    console.error('refresh-youtube-cache error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
