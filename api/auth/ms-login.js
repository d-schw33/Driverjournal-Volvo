import { createHash, randomBytes } from 'crypto';

export default function handler(req, res) {
  // Generate PKCE code verifier and challenge
  const codeVerifier  = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const tenantId = process.env.MS_TENANT_ID || 'common';

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.MS_CLIENT_ID,
    redirect_uri:          process.env.MS_REDIRECT_URI,
    scope:                 'Calendars.Read User.Read offline_access',
    response_mode:         'query',
    state:                 'korjournal',
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256'
  });

  // Store code verifier in cookie so callback can use it
  res.setHeader('Set-Cookie', `pkce=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
  res.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` + params);
}
