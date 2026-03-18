import { getSession, saveSession, newSessionId, createSessionCookie } from '../_utils.js';

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.redirect('/?error=' + encodeURIComponent(error));
  if (!code)  return res.redirect('/?error=no_code');

  try {
    const credentials = Buffer.from(
      process.env.VOLVO_CLIENT_ID + ':' + process.env.VOLVO_CLIENT_SECRET
    ).toString('base64');

    const tokenRes = await fetch('https://volvoid.eu.volvocars.com/as/token.oauth2', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: process.env.VOLVO_REDIRECT_URI
      }).toString()
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.redirect('/?error=' + encodeURIComponent(data.error_description || 'volvo_token_failed'));
    }

    // Get or create session
    let session = await getSession(req) || {};
    const sid   = req.headers.cookie?.match(/session=([^;]+)/)?.[1] || newSessionId();

    session.volvo = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + (data.expires_in || 1800) * 1000
    };

    await saveSession(sid, session);
    res.setHeader('Set-Cookie', `session=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    res.redirect('/?volvo=connected');

  } catch (e) {
    res.redirect('/?error=' + encodeURIComponent(e.message));
  }
}
