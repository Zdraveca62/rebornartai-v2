// app/api/update-youtube-cache/route.js
// Пълен refresh — views + duration_seconds за всички елементи
// Защитен с x-cron-secret header
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
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) throw new Error('YOUTUBE_API_KEY не е конфигуриран')

    // Вземаме всички youtube_id от music2 и videos
    const songsRes  = await query(`SELECT youtube_id, 'song'  AS item_type FROM music2  WHERE youtube_id IS NOT NULL`)
    const videosRes = await query(`SELECT youtube_id, 'video' AS item_type FROM videos WHERE youtube_id IS NOT NULL`)
    const allItems  = [...songsRes.rows, ...videosRes.rows]

    if (allItems.length === 0) {
      return NextResponse.json({ message: 'Няма елементи за обновяване', updated: 0 })
    }

    const BATCH = 50
    let updated = 0
    const errors = []

    for (let i = 0; i < allItems.length; i += BATCH) {
      const batch = allItems.slice(i, i + BATCH)
      const ids   = batch.map(r => r.youtube_id)

      let ytItems
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos` +
          `?part=snippet,statistics,contentDetails&id=${ids.join(',')}&key=${apiKey}`
        const res  = await fetch(url)
        const data = await res.json()
        ytItems = data.items ?? []
      } catch (err) {
        errors.push(`Batch ${i}: ${err.message}`)
        continue
      }

      await withTransaction(async (client) => {
        for (const item of ytItems) {
          const youtubeId    = item.id
          const title        = item.snippet?.title ?? ''
          const thumbnail    = item.snippet?.thumbnails?.medium?.url
                            ?? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
          const views        = parseInt(item.statistics?.viewCount ?? 0)
          const duration     = parseISO8601Duration(item.contentDetails?.duration)
          const itemType     = batch.find(r => r.youtube_id === youtubeId)?.item_type ?? 'song'

          await client.query(
            `INSERT INTO youtube_cache
               (youtube_id, title, thumbnail_url, views, item_type, duration_seconds, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (youtube_id) DO UPDATE SET
               title            = EXCLUDED.title,
               thumbnail_url    = EXCLUDED.thumbnail_url,
               views            = EXCLUDED.views,
               item_type        = EXCLUDED.item_type,
               duration_seconds = EXCLUDED.duration_seconds,
               last_updated     = NOW()`,
            [youtubeId, title, thumbnail, views, itemType, duration]
          )
          updated++
        }
      })
    }

    console.log(`✅ YouTube cache update: ${updated}/${allItems.length}`)
    return NextResponse.json({
      message: 'youtube_cache обновен',
      updated,
      total: allItems.length,
      ...(errors.length > 0 && { errors }),
    })

  } catch (err) {
    console.error('update-youtube-cache error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
