// lib/db.js
// Споделен PostgreSQL connection pool (node-postgres / pg)
// Импортирай навсякъде с: import { query, pool } from '@/lib/db';

import { Pool } from 'pg';

let pool;

// В dev режим (next dev с hot-reload) global кешираме pool-а,
// за да не отваряме нов pool при всеки file-save.
if (!global._raiPgPool) {
  global._raiPgPool = new Pool({
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE || 'rebornartai',
    user: process.env.PGUSER || 'rebornartai_user',
    password: process.env.PGPASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  global._raiPgPool.on('error', (err) => {
    console.error('[db] Неочаквана грешка в idle client на pool-а:', err);
  });
}

pool = global._raiPgPool;

/**
 * Изпълнява заявка през pool-а.
 * @param {string} text - SQL заявка с $1, $2... placeholders
 * @param {Array} params
 */
export async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    const duration = Date.now() - start;
    console.log('[db] query', { text, duration, rows: res.rowCount });
  }
  return res;
}

/**
 * За транзакции — взима dedicated client от pool-а.
 * Не забравяй client.release() в finally блок.
 * Пример:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
export async function getClient() {
  return pool.connect();
}

export { pool };

/**
 * Transaction wrapper — автоматично BEGIN/COMMIT/ROLLBACK
 * Употреба: await withTransaction(async (client) => { await client.query(...) })
 */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
