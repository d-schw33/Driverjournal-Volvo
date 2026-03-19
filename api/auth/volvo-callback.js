import { getSession, saveSession, newSessionId } from '../_utils.js';

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send('<h2>Volvo OAuth Error</h2><p>' + error + '</p><p>' + (error_description || '') + '</p><a href="/">← Tillbaka</a>');
  }

  if (!code) {
    return res.status(400).send('<h2>No code received</h2><p>' + JSON.stringify(req.query) + '</p><a href="/">← Tillbaka</a>');
  }

  const codeVerifier = req.headers.cookie?.match(/pkce_volvo=([^;]+)/)?.[1];
  if (!codeVerifier) {
    return res.status(400).send('<h2>PKCE Error</h2><p>Code verifier missing – try logging in again.</p><a href="/">← Tillbaka</a>');
  }

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
        grant_type:    'authorization_code',
        code,
        redirect_uri:  process.env.VOLVO_REDIRECT_URI,
        code_verifier: codeVerifier
      }).toString()
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(400).send('<h2>Token Error</h2><p>' + data.error + '</p><p>' + (data.error_description || '') + '</p><p>redirect_uri: ' + process.env.VOLVO_REDIRECT_URI + '</p><a href="/">← Tillbaka</a>');
    }

    let session = await getSession(req) || {};
    const sid   = req.headers.cookie?.match(/session=([^;]+)/)?.[1] || newSessionId();

    session.volvo = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + (data.expires_in || 1800) * 1000
    };

    await saveSession(sid, session);
    res.setHeader('Set-Cookie', [
      'session=' + sid + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000',
      'pkce_volvo=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    ]);
    res.redirect('/?volvo=connected');

  } catch (e) {
    res.status(500).send('<h2>Server Error</h2><p>' + e.message + '</p><a href="/">← Tillbaka</a>');
  }
}