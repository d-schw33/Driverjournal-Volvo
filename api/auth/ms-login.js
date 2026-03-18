export default function handler(req, res) {
  const params = new URLSearchParams({
    response_type:  'code',
    client_id:      process.env.MS_CLIENT_ID,
    redirect_uri:   process.env.MS_REDIRECT_URI,
    scope:          'Calendars.Read User.Read offline_access',
    response_mode:  'query',
    state:          'korjournal'
  });
  res.redirect('https://login.microsoftonline.com/e0714209-cb84-4e40-be0a-6555da0f9ebb/oauth2/v2.0/authorize?' + params);
}
