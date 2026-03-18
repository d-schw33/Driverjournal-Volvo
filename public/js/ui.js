// ─── Format helpers ──────────────────────────────────────────────────────────
const MONTHS_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
const DAYS_SV   = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS_SV[d.getDay()]} ${d.getDate()} ${MONTHS_SV[d.getMonth()].slice(0,3)}`;
}

function fmtMonth(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}`;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "2026-03"
}

function typeLabel(type) {
  if (type === 'work')    return 'Arbete';
  if (type === 'private') return 'Privat';
  return 'Okänd';
}

function kr(amount) {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function renderDashboard() {
  if (!State.volvo.trips.length) return;

  document.getElementById('dashboard-empty').style.display   = 'none';
  document.getElementById('dashboard-content').style.display = 'block';

  const trips    = State.volvo.trips;
  const work     = trips.filter(t => t.type === 'work');
  const priv     = trips.filter(t => t.type === 'private');
  const unknown  = trips.filter(t => t.type === 'unknown' || !t.type);
  const totalKm  = trips.reduce((s,t) => s + t.km, 0);
  const workKm   = work.reduce((s,t) => s + t.km, 0);
  const privKm   = priv.reduce((s,t) => s + t.km, 0);
  const workComp = workKm * State.settings.rateWork;

  // Period label
  const dates = trips.map(t => t.date).sort();
  document.getElementById('dashboard-period').textContent =
    `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length-1])} · ${trips.length} resor`;

  // KPIs
  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi total">
      <div class="kpi-label">Total sträcka</div>
      <div class="kpi-value">${Math.round(totalKm)} <span class="kpi-unit">km</span></div>
      <div class="kpi-sub">${trips.length} resor</div>
    </div>
    <div class="kpi work">
      <div class="kpi-label">Arbetsresor</div>
      <div class="kpi-value">${Math.round(workKm)} <span class="kpi-unit">km</span></div>
      <div class="kpi-sub">${work.length} resor</div>
    </div>
    <div class="kpi private">
      <div class="kpi-label">Privatresor</div>
      <div class="kpi-value">${Math.round(privKm)} <span class="kpi-unit">km</span></div>
      <div class="kpi-sub">${priv.length} resor · ${unknown.length} oklass.</div>
    </div>
    <div class="kpi money">
      <div class="kpi-label">Milersättning</div>
      <div class="kpi-value" style="font-size:20px">${kr(workComp)}</div>
      <div class="kpi-sub">${State.settings.rateWork} kr/km · arbete</div>
    </div>`;

  // Donut chart (CSS-based)
  const pWork = totalKm ? Math.round(workKm / totalKm * 100) : 0;
  const pPriv = totalKm ? Math.round(privKm / totalKm * 100) : 0;
  const pUnkn = 100 - pWork - pPriv;
  document.getElementById('type-chart').innerHTML = `
    <div class="donut-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110">
        ${donutSegments([
          { pct: pWork, color: '#1D9E75' },
          { pct: pPriv, color: '#E24B4A' },
          { pct: pUnkn, color: '#EF9F27' }
        ])}
        <circle cx="55" cy="55" r="30" fill="white"/>
        <text x="55" y="51" text-anchor="middle" font-size="16" font-weight="500" font-family="DM Sans,sans-serif" fill="#1a1a18">${pWork}%</text>
        <text x="55" y="64" text-anchor="middle" font-size="10" font-family="DM Sans,sans-serif" fill="#8a8884">arbete</text>
      </svg>
      <div class="donut-legend">
        <div class="legend-item"><div class="legend-dot" style="background:#1D9E75"></div><span class="legend-label">Arbete</span><span class="legend-val">${Math.round(workKm)} km</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#E24B4A"></div><span class="legend-label">Privat</span><span class="legend-val">${Math.round(privKm)} km</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#EF9F27"></div><span class="legend-label">Okänd</span><span class="legend-val">${Math.round(totalKm - workKm - privKm)} km</span></div>
      </div>
    </div>`;

  // Mileage bar chart by month
  const byMonth = {};
  work.forEach(t => {
    const k = monthKey(t.date);
    byMonth[k] = (byMonth[k] || 0) + t.km;
  });
  const months = Object.keys(byMonth).sort();
  const maxKm  = Math.max(...Object.values(byMonth), 1);
  document.getElementById('mileage-chart').innerHTML =
    '<div class="bar-chart">' +
    months.map(m => {
      const km   = byMonth[m];
      const pct  = Math.round(km / maxKm * 100);
      const d    = new Date(m + '-01');
      const lbl  = MONTHS_SV[d.getMonth()].slice(0,3) + ' ' + d.getFullYear();
      return `
        <div class="bar-item">
          <div class="bar-label"><span>${lbl}</span><span>${Math.round(km)} km · ${kr(km * State.settings.rateWork)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#1D9E75"></div></div>
        </div>`;
    }).join('') + '</div>';

  // Recent trips
  const recent = [...trips].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 6);
  document.getElementById('recent-trips').innerHTML = recent.map(t => tripRowHTML(t)).join('');
}

function donutSegments(segments) {
  const r = 42, cx = 55, cy = 55;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return segments.filter(s => s.pct > 0).map(s => {
    const dash   = (s.pct / 100) * circ;
    const gap    = circ - dash;
    const rotate = offset * 3.6 - 90;
    offset += s.pct;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="13"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0"
      transform="rotate(${rotate} ${cx} ${cy})"/>`;
  }).join('');
}

// ─── Trips view ──────────────────────────────────────────────────────────────
function renderTrips() {
  if (!State.volvo.trips.length) return;
  document.getElementById('trips-empty').style.display       = 'none';
  document.getElementById('trips-table-wrap').style.display  = 'block';

  // Populate month filter
  const months = [...new Set(State.volvo.trips.map(t => monthKey(t.date)))].sort().reverse();
  const sel    = document.getElementById('trip-month-filter');
  const curVal = sel.value;
  sel.innerHTML = '<option value="all">Alla månader</option>' +
    months.map(m => {
      const d = new Date(m + '-01');
      return `<option value="${m}">${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}</option>`;
    }).join('');
  if (curVal) sel.value = curVal;

  const mf   = document.getElementById('trip-month-filter').value;
  const tf   = document.getElementById('trip-type-filter').value;
  let trips  = [...State.volvo.trips].sort((a,b) => b.date.localeCompare(a.date));
  if (mf !== 'all') trips = trips.filter(t => t.date.startsWith(mf));
  if (tf !== 'all') trips = trips.filter(t => (t.type || 'unknown') === tf);

  document.getElementById('trips-list').innerHTML =
    trips.length ? trips.map(t => tripRowHTML(t)).join('') :
    '<div class="empty-state" style="padding:2rem"><div class="empty-sub">Inga resor matchar filtret.</div></div>';
}

function tripRowHTML(t) {
  const type = t.type || 'unknown';
  const comp = type === 'work' ? t.km * State.settings.rateWork :
               type === 'private' ? t.km * State.settings.ratePrivate : null;
  return `
    <div class="trip-row" onclick="openTripModal(${t.id})">
      <div class="trip-type-dot ${type}"></div>
      <div class="trip-main">
        <div class="trip-title">${t.start} → ${t.end}</div>
        <div class="trip-meta">${fmtDate(t.date)} · ${t.startTime}–${t.endTime}</div>
      </div>
      <div class="trip-stats">
        <div class="trip-stat"><div class="trip-stat-val">${t.km.toFixed(1)}</div><div class="trip-stat-label">km</div></div>
        <div class="trip-stat"><div class="trip-stat-val">${t.minutes}</div><div class="trip-stat-label">min</div></div>
        ${comp !== null ? `<div class="trip-stat"><div class="trip-stat-val">${kr(comp)}</div><div class="trip-stat-label">ersättning</div></div>` : ''}
      </div>
      <div class="trip-badge ${type}">${typeLabel(type)}</div>
    </div>`;
}

function openTripModal(id) {
  const t = State.volvo.trips.find(x => x.id === id);
  if (!t) return;
  const type = t.type || 'unknown';
  const comp = type === 'work' ? t.km * State.settings.rateWork : null;

  document.getElementById('trip-modal-title').textContent = `${t.start} → ${t.end}`;
  document.getElementById('trip-modal-content').innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:1rem">${fmtDate(t.date)} · ${t.startTime}–${t.endTime}</div>
    <div class="trip-detail-grid">
      <div class="trip-detail-kpi"><div class="kpi-label">Sträcka</div><div class="kpi-value">${t.km.toFixed(1)} <span class="kpi-unit">km</span></div></div>
      <div class="trip-detail-kpi"><div class="kpi-label">Körtid</div><div class="kpi-value">${t.minutes} <span class="kpi-unit">min</span></div></div>
      <div class="trip-detail-kpi"><div class="kpi-label">Snittfart</div><div class="kpi-value">${t.avgKmh} <span class="kpi-unit">km/h</span></div></div>
      <div class="trip-detail-kpi"><div class="kpi-label">Toppfart</div><div class="kpi-value">${t.maxKmh} <span class="kpi-unit">km/h</span></div></div>
      ${t.fuelL ? `<div class="trip-detail-kpi"><div class="kpi-label">Bränsle</div><div class="kpi-value">${t.fuelL.toFixed(1)} <span class="kpi-unit">L</span></div></div>` : ''}
      ${comp !== null ? `<div class="trip-detail-kpi"><div class="kpi-label">Milersättning</div><div class="kpi-value" style="font-size:18px">${kr(comp)}</div></div>` : ''}
    </div>
    ${t.matchedEvent ? `
      <div class="matched-event">
        <div class="matched-event-title">Matchad händelse: ${t.matchedEvent.subject}</div>
        <div class="matched-event-time">${fmtDate(t.matchedEvent.date)} · ${t.matchedEvent.startTime}–${t.matchedEvent.endTime}${t.matchedEvent.location ? ' · ' + t.matchedEvent.location : ''}</div>
      </div>` : ''}
    <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em">Klassificering</div>
    <div class="trip-classify-btns">
      <button class="classify-btn work ${type==='work'?'active':''}" onclick="reclassifyTrip(${t.id},'work');document.getElementById('trip-modal').style.display='none'">✓ Arbetsresa</button>
      <button class="classify-btn private ${type==='private'?'active':''}" onclick="reclassifyTrip(${t.id},'private');document.getElementById('trip-modal').style.display='none'">✓ Privat resa</button>
    </div>`;

  document.getElementById('trip-modal').style.display = 'flex';
}

function closeTripModal(e) {
  if (e.target.id === 'trip-modal') document.getElementById('trip-modal').style.display = 'none';
}

// ─── Calendar view ───────────────────────────────────────────────────────────
function renderCalendar() {
  if (!State.outlook.events.length) return;
  document.getElementById('calendar-empty').style.display   = 'none';
  document.getElementById('calendar-content').style.display = 'block';

  const events  = [...State.outlook.events].sort((a,b) => a.date.localeCompare(b.date));
  const grouped = {};
  events.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });

  document.getElementById('calendar-list').innerHTML =
    Object.keys(grouped).sort().map(date => `
      <div class="cal-date-header">${fmtDate(date)}</div>
      ${grouped[date].map(e => `
        <div class="cal-event ${e.isWork && !e.isOnline ? 'work-event' : ''}">
          <div class="cal-time">${e.startTime}–${e.endTime}</div>
          <div>
            <div class="cal-subject">${e.subject}</div>
            ${e.location ? `<div class="cal-loc">${e.location}</div>` : ''}
          </div>
          ${e.isWork ? '<div style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:100px;background:var(--work-lt);color:var(--work);border:0.5px solid var(--work-bd);white-space:nowrap">Arbete</div>' : ''}
        </div>`).join('')}
    `).join('');
}

// ─── Summary view ────────────────────────────────────────────────────────────
function renderSummary() {
  if (!State.volvo.trips.length) return;
  document.getElementById('summary-empty').style.display   = 'none';
  document.getElementById('summary-content').style.display = 'block';

  const byMonth = {};
  State.volvo.trips.forEach(t => {
    const k = monthKey(t.date);
    if (!byMonth[k]) byMonth[k] = { work:[], private:[], unknown:[] };
    const type = t.type || 'unknown';
    byMonth[k][type === 'work' ? 'work' : type === 'private' ? 'private' : 'unknown'].push(t);
  });

  document.getElementById('summary-table').innerHTML =
    Object.keys(byMonth).sort().reverse().map(m => {
      const data    = byMonth[m];
      const all     = [...data.work, ...data.private, ...data.unknown];
      const workKm  = data.work.reduce((s,t) => s+t.km, 0);
      const privKm  = data.private.reduce((s,t) => s+t.km, 0);
      const totalKm = all.reduce((s,t) => s+t.km, 0);
      const comp    = workKm * State.settings.rateWork;
      const d       = new Date(m + '-01');
      const label   = `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}`;

      return `
        <div class="summary-month">
          <div class="summary-month-header" onclick="toggleSummaryMonth('sm-${m}')">
            <div class="summary-month-title">${label}</div>
            <div class="summary-month-kpis">
              <span><strong>${all.length}</strong> resor</span>
              <span><strong>${Math.round(workKm)}</strong> km arbete</span>
              <span><strong>${Math.round(privKm)}</strong> km privat</span>
              <span style="color:var(--work)"><strong>${kr(comp)}</strong></span>
            </div>
          </div>
          <div class="summary-month-body" id="sm-${m}">
            <table class="summary-table-inner">
              <thead>
                <tr>
                  <th>Datum</th><th>Från</th><th>Till</th><th>Km</th><th>Typ</th><th>Ersättning</th>
                </tr>
              </thead>
              <tbody>
                ${all.sort((a,b) => a.date.localeCompare(b.date)).map(t => {
                  const type = t.type || 'unknown';
                  const c = type === 'work' ? t.km * State.settings.rateWork : type === 'private' ? t.km * State.settings.ratePrivate : 0;
                  return `<tr>
                    <td>${fmtDate(t.date)}</td>
                    <td>${t.start}</td>
                    <td>${t.end}</td>
                    <td>${t.km.toFixed(1)}</td>
                    <td><span class="trip-badge ${type}" style="font-size:11px">${typeLabel(type)}</span></td>
                    <td>${c > 0 ? kr(c) : '–'}</td>
                  </tr>`;
                }).join('')}
                <tr style="font-weight:500;border-top:1px solid var(--border)">
                  <td colspan="3">Totalt</td>
                  <td>${totalKm.toFixed(1)}</td>
                  <td></td>
                  <td>${kr(comp)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>`;
    }).join('');
}

function toggleSummaryMonth(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}

// ─── Settings modal ──────────────────────────────────────────────────────────
function openSettings() {
  document.getElementById('rate-work').value    = State.settings.rateWork;
  document.getElementById('rate-private').value = State.settings.ratePrivate;
  document.getElementById('settings-modal').style.display = 'flex';
}

function saveSettings() {
  State.settings.rateWork    = parseFloat(document.getElementById('rate-work').value)    || 2.50;
  State.settings.ratePrivate = parseFloat(document.getElementById('rate-private').value) || 0;
  document.getElementById('settings-modal').style.display = 'none';
  renderDashboard();
  renderTrips();
  renderSummary();
}

function closeSettings(e) {
  if (e.target.id === 'settings-modal') document.getElementById('settings-modal').style.display = 'none';
}
