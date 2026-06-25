// app/api/check-ip/route.js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

function getIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
  return ip
}

// GET — проверка на IP и регистриране на посещение
export async function GET(request) {
  try {
    const ip = getIP(request)

    const existing = await query(
      `SELECT id, email, visit_count, last_visit_at, access_level
       FROM registrations WHERE ip_address = $1`,
      [ip]
    )

    if (existing.rowCount > 0) {
      const row = existing.rows[0]
      const newCount = (row.visit_count || 1) + 1

      await query(
        `UPDATE registrations
         SET visit_count       = $1,
             previous_visit_at = last_visit_at,
             last_visit_at     = NOW()
         WHERE ip_address = $2`,
        [newCount, ip]
      )

      return NextResponse.json({
        status:       'returning',
        visit_count:  newCount,
        email:        row.email ?? null,
        access_level: row.access_level ?? 0,
      })

    } else {
      await query(
        `INSERT INTO registrations (ip_address, visit_count, last_visit_at, is_public_ip)
         VALUES ($1, 1, NOW(), $2)`,
        [ip, !ip.startsWith('127.') && !ip.startsWith('::1')]
      )

      return NextResponse.json({
        status:       'new',
        visit_count:  1,
        email:        null,
        access_level: 0,
      })
    }

  } catch (err) {
    console.error('check-ip GET error:', err)
    return NextResponse.json({ error: 'Server error', visit_count: 1 }, { status: 500 })
  }
}

// POST — действия: check_email, failed_attempt, reset_attempts
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    const ip = getIP(request)

    if (action === 'check_email') {
      const res = await query(
        `SELECT email, visit_count FROM registrations WHERE ip_address = $1`,
        [ip]
      )
      const row = res.rows[0]
      return NextResponse.json({
        has_email: !!row?.email,
        email:     row?.email ?? null,
      })
    }

    if (action === 'failed_attempt') {
      const res = await query(
        `UPDATE registrations
         SET failed_attempts = failed_attempts + 1
         WHERE ip_address = $1
         RETURNING failed_attempts`,
        [ip]
      )
      return NextResponse.json({
        failed_attempts: res.rows[0]?.failed_attempts ?? 1,
      })
    }

    if (action === 'reset_attempts') {
      await query(
        `UPDATE registrations SET failed_attempts = 0 WHERE ip_address = $1`,
        [ip]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('check-ip POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
