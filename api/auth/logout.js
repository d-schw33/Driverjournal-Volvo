import { deleteSession, clearSessionCookie } from '../_utils.js';

export default async function handler(req, res) {
  await deleteSession(req);
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.redirect('/');
}
