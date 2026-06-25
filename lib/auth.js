// lib/auth.js
// JWT + парола хелпъри. Универсална 24ч сесия за всички нива на достъп (0-3).

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// Ако предпочиташ native bcrypt (по-бърз, изисква build tools на сървъра):
//   npm install bcrypt   и замени import-а с: import bcrypt from 'bcrypt';
// bcryptjs е чист JS, по-бавен но не изисква компилация — по-безопасен избор за бърз старт.

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h'; // Фиксирано за ВСИЧКИ нива (0-3) — виж резюмето, сесия от тази дата
const SALT_ROUNDS = 12;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  // Не хвърляме throw на import-time за да не чупим build-а,
  // но логваме силно — трябва да е сложено в .env.local / .env.production
  console.error('[auth] ⚠️  JWT_SECRET липсва в env! Сложи дълъг random string в .env.local');
}

// ── Пароли ──────────────────────────────────────────────────────────────────

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

// ── JWT ─────────────────────────────────────────────────────────────────────

/**
 * @param {object} payload - { sub: user_id, email, access_level }
 */
export function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Връща decoded payload или null ако token е невалиден/изтекъл.
 */
export function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // изтекъл, подправен, или невалиден подпис
    return null;
  }
}

// ── Cookie helpers (httpOnly session cookie) ────────────────────────────────

export const SESSION_COOKIE_NAME = 'rai_session';
export const ADMIN_DEVICE_COOKIE_NAME = 'rai_admin_token';
export const VISITOR_COOKIE_NAME = 'rai_visitor_id';

export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24; // 24ч в секунди, синхронизирано с JWT_EXPIRY

export function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}
