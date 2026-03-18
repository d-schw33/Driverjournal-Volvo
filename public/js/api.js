// ── Init: check session status on load ───────────────────────────────────────
async function checkSession() {
  // Check for redirect params
  const params = new URLSearchParams(window.location.search);
  window.history.replaceState({}, document.title, '/');

  if (params.get('error')) {
    const view = document.getElementById('view-connect');
    if (view) {
      const err = document.createElement('div');
      err.className = 'alert-error';
      err.style.cssText = 'background:#FCEBEB;color:#791F1F;border:0.5px solid #F7C1C1;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:1rem;';
      err.textContent = 'Inloggning misslyckades: ' + decodeURIComponent(params.get('error'));
      view.querySelector('.view-header').after(err);
      setTimeout(() => err.remove(), 8000);
    }
  }

  try {
    const res  = await fetch('/api/me');
    const data = await res.json();

    if (data.volvo) {
      State.volvo.connected = true;
      setVolvoConnected('Ansluten via Volvo ID');
    }
    if (data.ms) {
      State.outlook.connected = true;
      const label = data.msUser ? data.msUser.name + ' (' + data.msUser.email + ')' : 'Ansluten';
      setOutlookConnected(label);
    }
    if (data.volvo && data.ms) {
      checkBothConnected();
    }
  } catch (e) {
    console.error('Session check failed:', e);
  }
}

// ── Volvo ─────────────────────────────────────────────────────────────────────
function startVolvoLogin() {
  const apiKey = document.getElementById('volvo-apikey').value.trim();
  if (!apiKey) {
    showFormError('volvo-error', 'Fyll i API-nyckeln innan du loggar in.');
    return;
  }
  sessionStorage.setItem('volvo_apikey', apiKey);
  sessionStorage.setItem('volvo_vin', document.getElementById('volvo-vin').value.trim().toUpperCase());
  window.location.href = '/auth/volvo/login';
}

async function fetchVolvoData() {
  const apiKey = sessionStorage.getItem('volvo_apikey') || '';
  const vin    = sessionStorage.getItem('volvo_vin')    || '';

  const btn = document.getElementById('volvo-btn');
  setLoading(btn, true, 'Hämtar körjournal');

  try {
    const params = new URLSearchParams({ apikey: apiKey });
    if (vin) params.set('vin', vin);

    const res  = await fetch('/api/trips?' + params);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte hämta körjournal');

    State.volvo.trips       = parseVolvoTrips(data.trips);
    State.volvo.vehicleName = data.model;
    State.volvo.vin         = data.vin;
    State.volvo.connected   = true;

    setVolvoConnected(data.model + ' · ' + data.vin);
    checkBothConnected();

  } catch (e) {
    showFormError('volvo-error', e.message);
  } finally {
    setLoading(btn, false, 'Logga in med Volvo ID →');
  }
}

function parseVolvoTrips(raw) {
  const pad = n => String(n).padStart(2, '0');
  return (raw || []).map((t, i) => {
    const start  = t.startTime || t.startedAt || '';
    const end    = t.endTime   || t.endedAt   || '';
    const startD = start ? new Date(start) : null;
    const endD   = end   ? new Date(end)   : null;
    const durMin = (startD && endD) ? Math.round((endD - startD) / 60000) : 0;
    const distM  = t.tripMeter?.value || t.distance?.value || 0;
    const distKm = distM > 1000 ? distM / 1000 : distM;
    return {
      id:        i + 1,
      date:      startD ? startD.toISOString().slice(0, 10) : '?',
      startTime: startD ? pad(startD.getHours()) + ':' + pad(startD.getMinutes()) : '?',
      endTime:   endD   ? pad(endD.getHours())   + ':' + pad(endD.getMinutes())   : '?',
      start:     t.startPosition?.streetAddress || 'Start',
      end:       t.endPosition?.streetAddress   || 'Slut',
      km:        Math.round(distKm * 10) / 10,
      minutes:   durMin,
      fuelL:     t.fuelConsumption?.value || 0,
      maxKmh:    t.maxSpeed?.value || 0,
      avgKmh:    distKm && durMin ? Math.round(distKm / (durMin / 60)) : 0,
      type:      null
    };
  });
}

function loadVolvoDemo() {
  State.volvo.trips       = JSON.parse(JSON.stringify(DEMO_TRIPS));
  State.volvo.connected   = true;
  State.volvo.vehicleName = 'XC60 T6 (DEMO)';
  State.volvo.vin         = 'YV1DEMO000000001';
  setVolvoConnected('XC60 T6 · DEMO');
  checkBothConnected();
}

function setVolvoConnected(label) {
  document.getElementById('volvo-form').style.display      = 'none';
  document.getElementById('volvo-connected').style.display = 'block';
  document.getElementById('volvo-vehicle-info').textContent = '✓  ' + label;
  document.getElementById('volvo-status-badge').textContent = 'Ansluten';
  document.getElementById('volvo-status-badge').classList.add('connected');
  document.querySelector('#conn-volvo .conn-dot').classList.replace('disconnected', 'connected');
  document.querySelector('#conn-volvo .conn-btn').textContent = '✓';
  document.querySelector('#conn-volvo .conn-btn').disabled = true;
}

function disconnectVolvo() {
  State.volvo.connected = false;
  State.volvo.trips     = [];
  fetch('/auth/logout');
  document.getElementById('volvo-form').style.display      = 'block';
  document.getElementById('volvo-connected').style.display = 'none';
  document.getElementById('volvo-status-badge').textContent = 'Ej ansluten';
  document.getElementById('volvo-status-badge').classList.remove('connected');
  document.querySelector('#conn-volvo .conn-dot').classList.replace('connected', 'disconnected');
  document.querySelector('#conn-volvo .conn-btn').textContent = 'Anslut';
  document.querySelector('#conn-volvo .conn-btn').disabled = false;
  document.getElementById('analyze-bar').style.display = 'none';
}

// ── Microsoft ─────────────────────────────────────────────────────────────────
function startMsLogin() {
  window.location.href = '/auth/ms/login';
}

async function fetchOutlookData() {
  const btn = document.getElementById('outlook-btn');
  setLoading(btn, true, 'Hämtar kalender');

  try {
    const res  = await fetch('/api/events');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte hämta kalender');

    State.outlook.events    = parseOutlookEvents(data.events);
    State.outlook.connected = true;
    checkBothConnected();

  } catch (e) {
    showFormError('outlook-error', e.message);
  } finally {
    setLoading(btn, false, 'Ansluten ✓');
  }
}

function parseOutlookEvents(raw) {
  const pad = n => String(n).padStart(2, '0');
  return (raw || []).map((e, i) => {
    const startD = new Date(e.start?.dateTime || e.start?.date);
    const endD   = new Date(e.end?.dateTime   || e.end?.date);
    return {
      id:        i + 1,
      date:      startD.toISOString().slice(0, 10),
      startTime: pad(startD.getHours()) + ':' + pad(startD.getMinutes()),
      endTime:   pad(endD.getHours())   + ':' + pad(endD.getMinutes()),
      subject:   e.subject || '(Ingen titel)',
      location:  e.location?.displayName || '',
      isOnline:  e.isOnlineMeeting || false,
      isWork:    isWorkEvent(e)
    };
  });
}

function isWorkEvent(e) {
  if (e.isOnlineMeeting) return true;
  const cats = (e.categories || []).join(' ').toLowerCase();
  if (cats.includes('privat') || cats.includes('personal') || cats.includes('familj')) return false;
  return true;
}

function loadOutlookDemo() {
  State.outlook.events    = JSON.parse(JSON.stringify(DEMO_EVENTS));
  State.outlook.connected = true;
  setOutlookConnected('Demo Användare (demo@outlook.com)');
  checkBothConnected();
}

function setOutlookConnected(label) {
  document.getElementById('outlook-form').style.display      = 'none';
  document.getElementById('outlook-connected').style.display = 'block';
  document.getElementById('outlook-user-info').textContent   = '✓  ' + label;
  document.getElementById('outlook-status-badge').textContent = 'Ansluten';
  document.getElementById('outlook-status-badge').classList.add('connected');
  document.querySelector('#conn-outlook .conn-dot').classList.replace('disconnected', 'connected');
  document.querySelector('#conn-outlook .conn-btn').textContent = '✓';
  document.querySelector('#conn-outlook .conn-btn').disabled = true;
}

function disconnectOutlook() {
  State.outlook.connected = false;
  State.outlook.events    = [];
  document.getElementById('outlook-form').style.display      = 'block';
  document.getElementById('outlook-connected').style.display = 'none';
  document.getElementById('outlook-status-badge').textContent = 'Ej ansluten';
  document.getElementById('outlook-status-badge').classList.remove('connected');
  document.querySelector('#conn-outlook .conn-dot').classList.replace('connected', 'disconnected');
  document.querySelector('#conn-outlook .conn-btn').textContent = 'Anslut';
  document.querySelector('#conn-outlook .conn-btn').disabled = false;
  document.getElementById('analyze-bar').style.display = 'none';
}

function checkBothConnected() {
  if (State.volvo.connected && State.outlook.connected) {
    document.getElementById('analyze-bar').style.display = 'block';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(btn, on, label) {
  btn.disabled    = on;
  btn.textContent = label;
  if (on) btn.classList.add('dot-anim');
  else    btn.classList.remove('dot-anim');
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 8000);
}
