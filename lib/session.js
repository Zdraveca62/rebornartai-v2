// lib/session.js
// Хелпър за server components и други API routes — извлича текущия потребител от JWT cookie.
// Употреба в server component:
//   import { getCurrentUser } from '@/lib/session';
//   const user = await getCurrentUser();
//   if (!user) redirect('/login');

import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

/**
 * @returns {{ id: string, email: string, access_level: number } | null}
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    access_level: payload.access_level,
  };
}

/**
 * Хвърля 401-еквивалентна проверка за route handlers (app/api/.../route.js).
 * Употреба:
 *   const user = await requireUser(request, minLevel=1);
 *   if (user instanceof NextResponse) return user; // вече е грешка, върни директно
 */
export async function requireUser(request, minLevel = 1) {
  const { NextResponse } = await import('next/server');
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 });
  }
  if (payload.access_level < minLevel) {
    return NextResponse.json({ error: 'Недостатъчни права' }, { status: 403 });
  }

  return {
    id: payload.sub,
    email: payload.email,
    access_level: payload.access_level,
  };
}
