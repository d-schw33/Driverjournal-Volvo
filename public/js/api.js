// ── Loading guards to prevent infinite loops ──────────────────────────────────
const _loading = { volvo: false, outlook: false };

// ── Init: check session status on load ───────────────────────────────────────
async function checkSession() {
  try {
    const res  = await fetch('/data/me');
    const data = await res.json();

    if (data.volvo) {
      State.volvo.connected = true;
      setVolvoConnected('Ansluten via Volvo ID');
      if (!State.volvo.trips.length && !_loading.volvo) {
        await fetchVolvoData();
      }
    }
    if (data.ms) {
      State.outlook.connected = true;
      const label = data.msUser ? data.msUser.name + ' (' + data.msUser.email + ')' : 'Ansluten';
      setOutlookConnected(label);
      if (!State.outlook.events.length && !_loading.outlook) {
        await fetchOutlookData();
      }
    }
    checkBothConnected();
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
  if (_loading.volvo) return;
  _loading.volvo = true;

  const apiKey = sessionStorage.getItem('volvo_apikey') || '';
  const vin    = sessionStorage.getItem('volvo_vin')    || '';
  const btn    = document.getElementById('volvo-btn');
  if (btn) setLoading(btn, true, 'Hämtar körjournal');

  try {
    const params = new URLSearchParams({ apikey: apiKey });
    if (vin) params.set('vin', vin);

    const res  = await fetch('/data/trips?' + params);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte hämta körjournal');

    State.volvo.trips       = parseVolvoTrips(data.trips);
    State.volvo.vehicleName = data.model;
    State.volvo.vin         = data.vin;
    State.volvo.connected   = true;

    setVolvoConnected((data.model || '') + (data.vin ? ' · ' + data.vin : ''));
    checkBothConnected();

  } catch (e) {
    console.error('fetchVolvoData error:', e);
    if (document.getElementById('volvo-error')) {
      showFormError('volvo-error', e.message);
    }
  } finally {
    _loading.volvo = false;
    if (btn) setLoading(btn, false, 'Logga in med Volvo ID →');
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
  const form  = document.getElementById('volvo-form');
  const conn  = document.getElementById('volvo-connected');
  const info  = document.getElementById('volvo-vehicle-info');
  const badge = document.getElementById('volvo-status-badge');
  const dot   = document.querySelector('#conn-volvo .conn-dot');
  const btn   = document.querySelector('#conn-volvo .conn-btn');
  if (form)  form.style.display  = 'none';
  if (conn)  conn.style.display  = 'block';
  if (info)  info.textContent    = '✓  ' + label;
  if (badge) { badge.textContent = 'Ansluten'; badge.classList.add('connected'); }
  if (dot)   dot.classList.replace('disconnected', 'connected');
  if (btn)   { btn.textContent = '✓'; btn.disabled = true; }
}

function disconnectVolvo() {
  State.volvo.connected = false;
  State.volvo.trips     = [];
  fetch('/auth/logout');
  const form  = document.getElementById('volvo-form');
  const conn  = document.getElementById('volvo-connected');
  const badge = document.getElementById('volvo-status-badge');
  const dot   = document.querySelector('#conn-volvo .conn-dot');
  const btn   = document.querySelector('#conn-volvo .conn-btn');
  if (form)  form.style.display  = 'block';
  if (conn)  conn.style.display  = 'none';
  if (badge) { badge.textContent = 'Ej ansluten'; badge.classList.remove('connected'); }
  if (dot)   dot.classList.replace('connected', 'disconnected');
  if (btn)   { btn.textContent = 'Anslut'; btn.disabled = false; }
  document.getElementById('analyze-bar').style.display = 'none';
}

// ── Microsoft ─────────────────────────────────────────────────────────────────
function startMsLogin() {
  window.location.href = '/auth/ms/login';
}

async function fetchOutlookData() {
  if (_loading.outlook) return;
  _loading.outlook = true;

  const btn = document.getElementById('outlook-btn');
  if (btn) setLoading(btn, true, 'Hämtar kalender');

  try {
    const res  = await fetch('/data/events');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kunde inte hämta kalender');

    State.outlook.events    = parseOutlookEvents(data.events);
    State.outlook.connected = true;
    checkBothConnected();

  } catch (e) {
    console.error('fetchOutlookData error:', e);
    if (document.getElementById('outlook-error')) {
      showFormError('outlook-error', e.message);
    }
  } finally {
    _loading.outlook = false;
    if (btn) setLoading(btn, false, 'Ansluten ✓');
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
  const form  = document.getElementById('outlook-form');
  const conn  = document.getElementById('outlook-connected');
  const info  = document.getElementById('outlook-user-info');
  const badge = document.getElementById('outlook-status-badge');
  const dot   = document.querySelector('#conn-outlook .conn-dot');
  const btn   = document.querySelector('#conn-outlook .conn-btn');
  if (form)  form.style.display  = 'none';
  if (conn)  conn.style.display  = 'block';
  if (info)  info.textContent    = '✓  ' + label;
  if (badge) { badge.textContent = 'Ansluten'; badge.classList.add('connected'); }
  if (dot)   dot.classList.replace('disconnected', 'connected');
  if (btn)   { btn.textContent = '✓'; btn.disabled = true; }
}

function disconnectOutlook() {
  State.outlook.connected = false;
  State.outlook.events    = [];
  const form  = document.getElementById('outlook-form');
  const conn  = document.getElementById('outlook-connected');
  const badge = document.getElementById('outlook-status-badge');
  const dot   = document.querySelector('#conn-outlook .conn-dot');
  const btn   = document.querySelector('#conn-outlook .conn-btn');
  if (form)  form.style.display  = 'block';
  if (conn)  conn.style.display  = 'none';
  if (badge) { badge.textContent = 'Ej ansluten'; badge.classList.remove('connected'); }
  if (dot)   dot.classList.replace('connected', 'disconnected');
  if (btn)   { btn.textContent = 'Anslut'; btn.disabled = false; }
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
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 8000);
}
