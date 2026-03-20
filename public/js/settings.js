// ── Settings – sparas i Turso via /api/settings ───────────────────────────────

const DEFAULT_SETTINGS = {
  carType:      'company',   // 'company' | 'electric' | 'private'
  rateWork:     0,           // kr/km för arbetsresor
  ratePrivate:  0,           // kr/km för privatresor (skattepliktig förmån)
  taxPrivate:   3.5,         // kr/km förmånsvärde tjänstebil privat (Skatteverket 2026)
  electricRate: 9.5,         // kr/km för elbil arbetsresor
  privateRate:  2.5,         // kr/km för privatbil arbetsresor (Skatteverket)
};

async function loadSettings() {
  try {
    const res  = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      Object.assign(State.settings, DEFAULT_SETTINGS, data);
    } else {
      Object.assign(State.settings, DEFAULT_SETTINGS);
    }
  } catch (e) {
    Object.assign(State.settings, DEFAULT_SETTINGS);
  }
  applyCarTypeRates();
}

async function saveSettingsToServer() {
  try {
    await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(State.settings)
    });
  } catch (e) {
    console.error('Could not save settings:', e);
  }
}

function applyCarTypeRates() {
  const s = State.settings;
  if (s.carType === 'company') {
    s.rateWork    = 0;           // Drivmedel betalt av arbetsgivaren
    s.ratePrivate = s.taxPrivate; // Förmånsvärde per privat km
  } else if (s.carType === 'electric') {
    s.rateWork    = s.electricRate; // 9,5 kr/km för tjänsteresor
    s.ratePrivate = 0;
  } else {
    s.rateWork    = s.privateRate;  // 2,5 kr/km Skatteverket
    s.ratePrivate = 0;
  }
}

function openSettings() {
  const s = State.settings;
  document.getElementById('setting-car-type').value    = s.carType    || 'company';
  document.getElementById('setting-tax-private').value = s.taxPrivate || 3.5;
  document.getElementById('setting-electric-rate').value = s.electricRate || 9.5;
  document.getElementById('setting-private-rate').value  = s.privateRate  || 2.5;
  updateSettingsUI(s.carType || 'company');
  document.getElementById('settings-modal').style.display = 'flex';
}

function updateSettingsUI(carType) {
  document.getElementById('settings-company').style.display  = carType === 'company'  ? 'block' : 'none';
  document.getElementById('settings-electric').style.display = carType === 'electric' ? 'block' : 'none';
  document.getElementById('settings-private').style.display  = carType === 'private'  ? 'block' : 'none';
}

async function saveSettings() {
  const carType = document.getElementById('setting-car-type').value;
  State.settings.carType      = carType;
  State.settings.taxPrivate   = parseFloat(document.getElementById('setting-tax-private').value)   || 3.5;
  State.settings.electricRate = parseFloat(document.getElementById('setting-electric-rate').value) || 9.5;
  State.settings.privateRate  = parseFloat(document.getElementById('setting-private-rate').value)  || 2.5;
  applyCarTypeRates();
  await saveSettingsToServer();
  document.getElementById('settings-modal').style.display = 'none';
  renderDashboard();
  renderTrips();
  renderSummary();
}

function closeSettings(e) {
  if (e.target.id === 'settings-modal') document.getElementById('settings-modal').style.display = 'none';
}