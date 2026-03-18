import { getSession, saveSession, getValidVolvoToken } from './_utils.js';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session?.volvo?.refreshToken) {
    return res.status(401).json({ error: 'Volvo not connected' });
  }

  const sid    = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  const token  = await getValidVolvoToken(session);
  if (!token) return res.status(401).json({ error: 'Volvo token refresh failed' });

  // Save updated session (token may have been refreshed)
  if (sid) await saveSession(sid, session);

  const apiKey = req.query.apikey || '';

  try {
    // Get VIN
    const vRes = await fetch('https://api.volvocars.com/connected-vehicle/v2/vehicles', {
      headers: { 'Authorization': 'Bearer ' + token, 'vcc-api-key': apiKey }
    });
    if (!vRes.ok) return res.status(vRes.status).json({ error: 'Could not fetch vehicles' });
    const vData = await vRes.json();
    if (!vData.data?.length) return res.status(404).json({ error: 'No vehicles found' });

    const vin   = req.query.vin || vData.data[0].vin;
    const model = vData.data[0].descriptions?.model || vin;

    // Get trips
    const tRes = await fetch(
      `https://api.volvocars.com/connected-vehicle/v2/vehicles/${vin}/trips`,
      { headers: { 'Authorization': 'Bearer ' + token, 'vcc-api-key': apiKey } }
    );
    if (!tRes.ok) return res.status(tRes.status).json({ error: 'Could not fetch trips' });
    const tData = await tRes.json();

    res.json({ vin, model, trips: tData.data || [] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
