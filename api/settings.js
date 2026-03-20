import { getSession, saveSession } from './_utils.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const sid = req.headers.cookie?.match(/session=([^;]+)/)?.[1];

  if (req.method === 'GET') {
    return res.json(session.settings || {});
  }

  if (req.method === 'POST') {
    let body = '';
    await new Promise(resolve => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
    });
    try {
      const settings = JSON.parse(body);
      session.settings = settings;
      if (sid) await saveSession(sid, session);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}