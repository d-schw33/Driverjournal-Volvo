import { getSession, saveSession, newSessionId } from '../_utils.js';

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send('<h2>Error: ' + error + '</h2><p>' + (error_description || '') + '</p><a href="/">← Tillbaka</a>');
  }

  if (!code) {
    return res.status(400).send('<h2>No code received</h2><a href="/">← Tillbaka</a>');
  }

  const codeVerifier = req.headers.cookie?.match(/pkce=([^;]+)/)?.[1];
  if (!codeVerifier) {
    return res.status(400).send('<h2>PKCE Error: code verifier missing</h2><a href="/">← Tillbaka</a>');
  }

  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/' + process.env.MS_TENANT_ID + '/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code:          code,
        redirect_uri:  process.env.MS_REDIRECT_URI,
        client_id:     process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        scope:         'Calendars.Read User.Read offline_access',
        code_verifier: codeVerifier
      }).toString()
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(400).send('<h2>Token Error: ' + data.error + '</h2><p>' + data.error_description + '</p><a href="/">← Tillbaka</a>');
    }

    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: 'Bearer ' + data.access_token }
    });
    const me = meRes.ok ? await meRes.json() : {};

    let session = await getSession(req) || {};
    const sid = req.headers.cookie?.match(/session=([^;]+)/)?.[1] || newSessionId();

    session.ms = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + (data.expires_in || 3600) * 1000,
      userName:     me.displayName || '',
      userEmail:    me.mail || me.userPrincipalName || ''
    };

    await saveSession(sid, session);
    res.setHeader('Set-Cookie', [
      'session=' + sid + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000',
      'pkce=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    ]);
    res.redirect('/?ms=connected');

  } catch (e) {
    res.status(500).send('<h2>Server Error</h2><p>' + e.message + '</p><a href="/">← Tillbaka</a>');
  }
}