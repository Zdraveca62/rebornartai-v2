// app/api/cron/refresh-youtube/route.js
// Извиква се от Linux cron — обновява views от YouTube API
// Защитен с x-cron-secret header (същия като update-youtube-cache)
import { NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'

function parseISO8601Duration(iso) {
  if (!iso) return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return null
  const hours   = parseInt(match[1] ?? 0)
  const minutes = parseInt(match[2] ?? 0)
  const seconds = parseInt(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}

export async function GET(request) {
  // Проверка за cron secret
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) throw new Error('YOUTUBE_API_KEY не е конфигуриран')

    const cacheRes = await query(`SELECT youtube_id FROM youtube_cache`)
    const ids = cacheRes.rows.map(r => r.youtube_id).filter(Boolean)

    if (ids.length === 0) throw new Error('Няма youtube_id за обновяване')

    // Batch по 50 (YouTube API лимит)
    const BATCH = 50
    let updated = 0

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH)
      const url = `https://www.googleapis.com/youtube/v3/videos` +
        `?key=${apiKey}&id=${batch.join(',')}&part=statistics,contentDetails`

      const res  = await fetch(url)
      const data = await res.json()
      if (!data.items) continue

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
          updated++
        }
      })
    }

    return NextResponse.json({ success: true, updated, total: ids.length })

  } catch (err) {
    console.error('cron/refresh-youtube error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
