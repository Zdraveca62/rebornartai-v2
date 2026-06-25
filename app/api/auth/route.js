// app/api/auth/route.js
//
// Auth endpoint — bcrypt + JWT, 24ч universal сесия за всички нива (0-3).
// Замества Supabase Auth изцяло.
//
// Actions:
//   - link_email   : запазена логика от старата версия (IP → registrations таблица)
//   - signup       : регистрация (Ниво 0 → Ниво 1), bcrypt hash, auto-login
//   - login        : вход с email + парола, връща httpOnly JWT cookie
//   - logout       : изчиства session cookie-то
//   - check_admin_device : проверява rai_admin_token cookie за "Здравей, Администраторе" flow
//
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query, getClient } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  ADMIN_DEVICE_COOKIE_NAME,
  buildSessionCookieOptions,
} from '@/lib/auth';

function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

// Минимална валидация на email формат (UI вече валидира, това е defense-in-depth)
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невалиден JSON' }, { status: 400 });
  }

  const { action, email, password, full_name, phone, address } = body;
  const ip = getClientIP(request);

  // ── link_email ────────────────────────────────────────────────────────────
  // Непроменена логика спрямо старата версия, само през pg вместо Supabase.
  if (action === 'link_email') {
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Липсва валиден email' }, { status: 400 });
    }

    try {
      const existing = await query(
        'SELECT ip_address FROM registrations WHERE ip_address = $1 LIMIT 1',
        [ip]
      );

      if (existing.rowCount > 0) {
        const updated = await query(
          'UPDATE registrations SET email = $1 WHERE ip_address = $2 RETURNING *',
          [email, ip]
        );
        return NextResponse.json({ success: true, updated: updated.rows });
      } else {
        const inserted = await query(
          `INSERT INTO registrations
             (ip_address, email, visit_count, failed_attempts, is_public_ip, last_visit_at)
           VALUES ($1, $2, 1, 0, true, now())
           RETURNING *`,
          [ip, email]
        );
        return NextResponse.json({ success: true, inserted: inserted.rows });
      }
    } catch (err) {
      console.error('[auth] link_email грешка:', err);
      return NextResponse.json({ error: 'Вътрешна грешка' }, { status: 500 });
    }
  }

  // ── signup ────────────────────────────────────────────────────────────────
  if (action === 'signup') {
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Липсва валиден email' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Паролата трябва да е поне 8 символа' },
        { status: 400 }
      );
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM profiles WHERE email = $1 LIMIT 1',
        [email]
      );
      if (existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Вече има профил с този email' },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);
      const initials = (full_name || email)
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();

      const inserted = await client.query(
        `INSERT INTO profiles
           (email, password_hash, email_confirmed, full_name, initials, phone, address, access_level)
         VALUES ($1, $2, false, $3, $4, $5, $6, 1)
         RETURNING id, email, full_name, access_level, created_at`,
        [email, passwordHash, full_name || null, initials || null, phone || null, address || null]
      );
      const profile = inserted.rows[0];

      // Свържи registrations записа по IP, ако вече съществува (запазена стара логика)
      const regExisting = await client.query(
        'SELECT ip_address FROM registrations WHERE ip_address = $1 LIMIT 1',
        [ip]
      );
      if (regExisting.rowCount > 0) {
        await client.query(
          'UPDATE registrations SET email = $1 WHERE ip_address = $2',
          [email, ip]
        );
      } else {
        await client.query(
          `INSERT INTO registrations
             (ip_address, email, visit_count, failed_attempts, is_public_ip, last_visit_at)
           VALUES ($1, $2, 1, 0, true, now())`,
          [ip, email]
        );
      }

      await client.query('COMMIT');

      // Auto-login след успешна регистрация
      const token = signSessionToken({
        sub: profile.id,
        email: profile.email,
        access_level: profile.access_level,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          access_level: profile.access_level,
        },
      });
      response.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
      return response;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[auth] signup грешка:', err);
      return NextResponse.json({ error: 'Вътрешна грешка при регистрация' }, { status: 500 });
    } finally {
      client.release();
    }
  }

  // ── login ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return NextResponse.json({ error: 'Липсва email или парола' }, { status: 400 });
    }

    try {
      const result = await query(
        `SELECT id, email, password_hash, full_name, access_level
         FROM profiles WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (result.rowCount === 0) {
        // Не разкриваме дали email-ът съществува — generic грешка
        return NextResponse.json({ error: 'Невалиден email или парола' }, { status: 401 });
      }

      const profile = result.rows[0];
      const ok = await verifyPassword(password, profile.password_hash);

      if (!ok) {
        return NextResponse.json({ error: 'Невалиден email или парола' }, { status: 401 });
      }

      const token = signSessionToken({
        sub: profile.id,
        email: profile.email,
        access_level: profile.access_level,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          access_level: profile.access_level,
        },
      });
      response.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());

      // Ниво 3 (admin) → постави и постоянния admin_device_token, ако още няма такъв
      if (profile.access_level === 3) {
        const deviceCheck = await query(
          'SELECT admin_device_token FROM profiles WHERE id = $1',
          [profile.id]
        );
        let deviceToken = deviceCheck.rows[0]?.admin_device_token;

        if (!deviceToken) {
          deviceToken = crypto.randomBytes(32).toString('hex');
          await query(
            'UPDATE profiles SET admin_device_token = $1, admin_device_set_at = now() WHERE id = $2',
            [deviceToken, profile.id]
          );
        }

        response.cookies.set(ADMIN_DEVICE_COOKIE_NAME, deviceToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365 * 2, // 2 години — дълготраен device recognition cookie
        });
      }

      return response;
    } catch (err) {
      console.error('[auth] login грешка:', err);
      return NextResponse.json({ error: 'Вътрешна грешка при вход' }, { status: 500 });
    }
  }

  // ── logout ────────────────────────────────────────────────────────────────
  if (action === 'logout') {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, '', { ...buildSessionCookieOptions(), maxAge: 0 });
    return response;
  }

  // ── check_admin_device ───────────────────────────────────────────────────
  // Извиква се от Home страницата при зареждане, за "Здравей, Администраторе" flow.
  // Връща { isAdminDevice: true, email } ако cookie-то съвпада с профил с access_level=3.
  if (action === 'check_admin_device') {
    const deviceToken = request.cookies.get(ADMIN_DEVICE_COOKIE_NAME)?.value;
    if (!deviceToken) {
      return NextResponse.json({ isAdminDevice: false });
    }

    try {
      const result = await query(
        `SELECT id, email FROM profiles
         WHERE admin_device_token = $1 AND access_level = 3 LIMIT 1`,
        [deviceToken]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ isAdminDevice: false });
      }
      return NextResponse.json({ isAdminDevice: true, email: result.rows[0].email });
    } catch (err) {
      console.error('[auth] check_admin_device грешка:', err);
      return NextResponse.json({ isAdminDevice: false });
    }
  }

  return NextResponse.json({ error: 'Непознат action' }, { status: 400 });
}

// ── GET /api/auth — проверка на текущата сесия (за middleware / клиентски hooks) ──
export async function GET(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);

  if (!payload) {
    return NextResponse.json({ authenticated: false, access_level: 0 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      access_level: payload.access_level,
    },
  });
}
