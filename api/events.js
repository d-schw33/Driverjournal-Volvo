import { getSession, saveSession, getValidMsToken } from './_utils.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session?.ms?.refreshToken) {
    return res.status(401).json({ error: 'Microsoft not connected' });
  }

  const sid   = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  const token = await getValidMsToken(session);
  if (!token) return res.status(401).json({ error: 'Microsoft token refresh failed' });

  if (sid) await saveSession(sid, session);

  const from = new Date(); from.setDate(from.getDate() - 60);
  const to   = new Date(); to.setDate(to.getDate() + 30);
  const fmt  = d => d.toISOString().slice(0, 19) + 'Z';

  try {
    const evRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${fmt(from)}&endDateTime=${fmt(to)}&$top=200&$select=subject,start,end,isAllDay,isOnlineMeeting,location,categories`,
      {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Prefer':        'outlook.timezone="Europe/Stockholm"'
        }
      }
    );
    if (!evRes.ok) return res.status(evRes.status).json({ error: 'Could not fetch events' });
    const evData = await evRes.json();
    res.json({ events: evData.value || [] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
