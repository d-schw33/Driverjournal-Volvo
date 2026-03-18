import { kv } from '@vercel/kv';
import { createHash, randomBytes } from 'crypto';

// ── Session ──────────────────────────────────────────────────────────────────
export function getSessionId(req) {
  const cookie = req.headers.cookie || '';
  const match  = cookie.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function createSessionCookie(sessionId) {
  return `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function newSessionId() {
  return randomBytes(32).toString('hex');
}

// ── KV helpers ───────────────────────────────────────────────────────────────
export async function getSession(req) {
  const sid = getSessionId(req);
  if (!sid) return null;
  return await kv.get('session:' + sid);
}

export async function saveSession(sid, data, ttl = 2592000) {
  await kv.set('session:' + sid, data, { ex: ttl });
}

export async function deleteSession(req) {
  const sid = getSessionId(req);
  if (sid) await kv.del('session:' + sid);
}

// ── Volvo token refresh ───────────────────────────────────────────────────────
export async function getValidVolvoToken(session) {
  const now = Date.now();
  // If token still valid (with 60s buffer), return it
  if (session.volvo?.accessToken && session.volvo.expiresAt > now + 60000) {
    return session.volvo.accessToken;
  }
  // Refresh
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

  const res = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: session.ms.refreshToken,
        client_id:     process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        scope:         'Calendars.Read User.Read offline_access'
      }).toString()
    }
  );

  if (!res.ok) return null;
  const data = await res.json();

  session.ms.accessToken  = data.access_token;
  session.ms.refreshToken = data.refresh_token || session.ms.refreshToken;
  session.ms.expiresAt    = now + (data.expires_in || 3600) * 1000;

  return data.access_token;
}
