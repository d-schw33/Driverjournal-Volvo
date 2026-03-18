import { getSession } from './_utils.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) {
    return res.json({ volvo: false, ms: false });
  }
  res.json({
    volvo: !!session.volvo?.refreshToken,
    ms:    !!session.ms?.refreshToken,
    msUser: session.ms ? {
      name:  session.ms.userName,
      email: session.ms.userEmail
    } : null
  });
}
