export default function handler(req, res) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.VOLVO_CLIENT_ID,
    redirect_uri:  process.env.VOLVO_REDIRECT_URI,
    scope:         'openid conve:trip_statistics conve:vehicle_relation',
    state:         'korjournal'
  });
  res.redirect('https://volvoid.eu.volvocars.com/as/authorization.oauth2?' + params);
}
