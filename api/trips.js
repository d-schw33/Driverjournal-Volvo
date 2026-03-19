import { getSession, saveSession, getValidVolvoToken } from './_utils.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session?.volvo?.refreshToken) {
    return res.status(401).json({ error: 'Volvo not connected' });
  }

  const sid   = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  const token = await getValidVolvoToken(session);
  if (!token) return res.status(401).json({ error: 'Volvo token refresh failed' });
  if (sid) await saveSession(sid, session);

  const apiKey = process.env.VOLVO_API_KEY || req.query.apikey || '';

  try {
    const vRes = await fetch('https://api.volvocars.com/connected-vehicle/v2/vehicles', {
      headers: { 'Authorization': 'Bearer ' + token, 'vcc-api-key': apiKey }
    });
    if (!vRes.ok) {
      const errBody = await vRes.json().catch(() => ({}));
      console.log('Volvo vehicles error:', vRes.status, JSON.stringify(errBody));
      return res.status(vRes.status).json({ error: 'Could not fetch vehicles', status: vRes.status, detail: errBody });
    }
    const vData = await vRes.json();
    if (!vData.data?.length) return res.status(404).json({ error: 'No vehicles found' });

    const vin   = req.query.vin || vData.data[0].vin;
    const model = vData.data[0].descriptions?.model || vin;

    const tRes = await fetch(
      'https://api.volvocars.com/connected-vehicle/v2/vehicles/' + vin + '/trips',
      { headers: { 'Authorization': 'Bearer ' + token, 'vcc-api-key': apiKey } }
    );
    if (!tRes.ok) {
      const errBody = await tRes.json().catch(() => ({}));
      console.log('Volvo trips error:', tRes.status, JSON.stringify(errBody));
      return res.status(tRes.status).json({ error: 'Could not fetch trips', status: tRes.status, detail: errBody });
    }

    const tData = await tRes.json();
    res.json({ vin, model, trips: tData.data || [] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}