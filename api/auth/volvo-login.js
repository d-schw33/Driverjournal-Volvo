import { createHash, randomBytes } from 'crypto';

export default function handler(req, res) {
  const codeVerifier  = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.VOLVO_CLIENT_ID,
    redirect_uri:          process.env.VOLVO_REDIRECT_URI,
    scope:                 'openid conve:trip_statistics conve:vehicle_relation',
    state:                 'korjournal',
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256'
  });

  res.setHeader('Set-Cookie', 'pkce_volvo=' + codeVerifier + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300');
  res.redirect('https://volvoid.eu.volvocars.com/as/authorization.oauth2?' + params);
}