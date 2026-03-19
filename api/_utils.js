// Uses Turso HTTP API directly instead of @libsql/client

async function tursoQuery(sql, args = []) {
  const url = process.env.TURSO_DATABASE_URL.replace('libsql://', 'https://');
  const res = await fetch(url + '/v2/pipeline', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.TURSO_AUTH_TOKEN,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(a => ({ type: 'text', value: String(a) })) } },
        { type: 'close' }
      ]
    })
  });
  if (!res.ok) throw new Error('Turso error: ' + res.status + ' ' + await res.text());
  return await res.json();
}

async function initDb() {
  await tursoQuery(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);
}

export function getSessionId(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function newSessionId() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function clearSessionCookie() {
  return 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export async function getSession(req) {
  const sid = getSessionId(req);
  if (!sid) return null;
  try {
    await initDb();
    const now = Date.now();
    const result = await tursoQuery(
      'SELECT data FROM sessions WHERE id = ? AND expires_at > ?',
      [sid, now]
    );
    const rows = result.results?.[0]?.response?.result?.rows || [];
    if (!rows.length) return null;
    return JSON.parse(rows[0][0].value);
  } catch (e) {
    console.error('getSession error:', e.message);
    return null;
  }
}

export async function saveSession(sid, data, ttlSeconds = 2592000) {
  try {
    await initDb();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    await tursoQuery(
      'INSERT OR REPLACE INTO sessions (id, data, expires_at) VALUES (?, ?, ?)',
      [sid, JSON.stringify(data), expiresAt]
    );
  } catch (e) {
    console.error('saveSession error:', e.message);
  }
}

export async function deleteSession(req) {
  const sid = getSessionId(req);
  if (!sid) return;
  try {
    await initDb();
    await tursoQuery('DELETE FROM sessions WHERE id = ?', [sid]);
  } catch (e) {
    console.error('deleteSession error:', e.message);
  }
}

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

export async function getValidMsToken(session) {
  const now = Date.now();
  if (session.ms?.accessToken && session.ms.expiresAt > now + 60000) {
    return session.ms.accessToken;
  }
  if (!session.ms?.refreshToken) return null;

  const res = await fetch('https://login.microsoftonline.com/' + process.env.MS_TENANT_ID + '/oauth2/v2.0/token', {
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
