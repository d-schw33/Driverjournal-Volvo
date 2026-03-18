import { createClient } from '@libsql/client';

function getDb() {
  return createClient({
    url:       process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

// ── Init DB (creates table if not exists) ────────────────────────────────────
async function initDb(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);
}

// ── Session helpers ───────────────────────────────────────────────────────────
export function getSessionId(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function newSessionId() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

export function createSessionCookie(sid) {
  return `session=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getSession(req) {
  const sid = getSessionId(req);
  if (!sid) return null;
  const db = getDb();
  await initDb(db);
  const now = Date.now();
  const res = await db.execute({
    sql:  'SELECT data FROM sessions WHERE id = ? AND expires_at > ?',
    args: [sid, now]
  });
  if (!res.rows.length) return null;
  return JSON.parse(res.rows[0].data);
}

export async function saveSession(sid, data, ttlSeconds = 2592000) {
  const db        = getDb();
  await initDb(db);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  await db.execute({
    sql:  'INSERT OR REPLACE INTO sessions (id, data, expires_at) VALUES (?, ?, ?)',
    args: [sid, JSON.stringify(data), expiresAt]
  });
}

export async function deleteSession(req) {
  const sid = getSessionId(req);
  if (!sid) return;
  const db = getDb();
  await initDb(db);
  await db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [sid] });
}

// ── Volvo token refresh ───────────────────────────────────────────────────────
export async function getValidVolvoToken(session) {
  const now = Date.now();
  if (session.volvo?.accessToken && session.volvo.expiresAt > now + 60000) {
    return session.volvo.accessToken;
  }
  if (!session.volvo?.refreshToken) return null;

  const credentials = Buffer.from(
    process.env.VOLVO_CLIENT_ID + ':' + process.env.VOLVO_CLIENT_SECRET
  ).toString('base64');

  const res = await fetch('https://volvoid.eu.volvocars.com/as/token.oauth2', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + credentials
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: session.volvo.refreshToken
    }).toString()
  });

  if (!res.ok) return null;
  const data = await res.json();

  session.volvo.accessToken  = data.access_token;
  session.volvo.refreshToken = data.refresh_token || session.volvo.refreshToken;
  session.volvo.expiresAt    = now + (data.expires_in || 1800) * 1000;

  return data.access_token;
}

// ── Microsoft token refresh ───────────────────────────────────────────────────
export async function getValidMsToken(session) {
  const now = Date.now();
  if (session.ms?.accessToken && session.ms.expiresAt > now + 60000) {
    return session.ms.accessToken;
  }
  if (!session.ms?.refreshToken) return null;

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: session.ms.refreshToken,
      client_id:     process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      scope:         'Calendars.Read User.Read offline_access'
    }).toString()
  });

  if (!res.ok) return null;
  const data = await res.json();

  session.ms.accessToken  = data.access_token;
  session.ms.refreshToken = data.refresh_token || session.ms.refreshToken;
  session.ms.expiresAt    = now + (data.expires_in || 3600) * 1000;

  return data.access_token;
}
