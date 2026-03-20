// ─── Format helpers ──────────────────────────────────────────────────────────
const MONTHS_SV = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
const DAYS_SV   = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS_SV[d.getDay()]} ${d.getDate()} ${MONTHS_SV[d.getMonth()].slice(0,3)}`;
}

function monthKey(dateStr) { return dateStr.slice(0, 7); }

function typeLabel(type) {
  if (type === 'work')    return 'Arbete';
  if (type === 'private') return 'Privat';
  return 'Okänd';
}

function kr(amount) {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
}

function compensationLabel() {
  const s = State.settings;
  if (s.carType === 'company')  return `${s.taxPrivate} kr/km · förmånsvärde privat`;
  if (s.carType === 'electric') return `${s.electricRate} kr/km · arbetsresor`;
  return `${s.privateRate} kr/km · arbetsresor`;
}

function compensationAmount(type, km) {
  const s = State.settings;
  if (s.carType === 'company')  return type === 'private' ? km * s.taxPrivate  : 0;
  if (s.carType === 'electric') return type === 'work'    ? km * s.electricRate : 0;
  return type === 'work' ? km * s.privateRate : 0;
}

function compensationTitle() {
  return State.settings.carType === 'company' ? 'Förmånsvärde privat' : 'Milersättning arbete';
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function renderDashboard() {
  if (!State.volvo.trips.length) return;
  document.getElementById('dashboard-empty').style.display   = 'none';
  document.getElementById('dashboard-content').style.display = 'block';

  const trips   = State.volvo.trips;
  const work    = trips.filter(t => t.type === 'work');
  const priv    = trips.filter(t => t.type === 'private');
  const unknown = trips.filter(t => t.type === 'unknown' || !t.type);
  const totalKm = trips.reduce((s,t) => s + t.km, 0);
  const workKm  = work.reduce((s,t) => s + t.km, 0);
  const privKm  = priv.reduce((s,t) => s + t.km, 0);
  const totalComp = trips.reduce((s,t) => s + compensationAmount(t.type, t.km), 0);

  const dates = trips.map(t => t.date).sort();
  document.getElementById('dashboard-period').textContent =
    `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length-1])} · ${trips.length} resor`;

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
      <div class="kpi-label">${compensationTitle()}</div>
      <div class="kpi-value" style="font-size:20px">${kr(totalComp)}</div>
      <div class="kpi-sub">${compensationLabel()}</div>
    </div>`;

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

  const byMonth = {};
  trips.forEach(t => {
    const k = monthKey(t.date);
    if (!byMonth[k]) byMonth[k] = 0;
    byMonth[k] += compensationAmount(t.type, t.km);
  });
  const months  = Object.keys(byMonth).sort();
  const maxComp = Math.max(...Object.values(byMonth), 1);
  document.getElementById('mileage-chart').innerHTML =
    '<div class="bar-chart">' +
    months.map(m => {
      const comp = byMonth[m];
      const pct  = Math.round(comp / maxComp * 100);
      const d    = new Date(m + '-01');
      const lbl  = MONTHS_SV[d.getMonth()].slice(0,3) + ' ' + d.getFullYear();
      return `<div class="bar-item">
        <div class="bar-label"><span>${lbl}</span><span>${kr(comp)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#1D9E75"></div></div>
      </div>`;
    }).join('') + '</div>';

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
  document.getElementById('trips-empty').style.display      = 'none';
  document.getElementById('trips-table-wrap').style.display = 'block';

  const months = [...new Set(State.volvo.trips.map(t => monthKey(t.date)))].sort().reverse();
  const sel    = document.getElementById('trip-month-filter');
  const curVal = sel.value;
  sel.innerHTML = '<option value="all">Alla månader</option>' +
    months.map(m => {
      const d = new Date(m + '-01');
      return `<option value="${m}">${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}</option>`;
    }).join('');
  if (curVal) sel.value = curVal;

  const mf  = document.getElementById('trip-month-filter').value;
  const tf  = document.getElementById('trip-type-filter').value;
let trips = [...State.volvo.trips].sort((a,b) => {
  const dateComp = b.date.localeCompare(a.date);
  if (dateComp !== 0) return dateComp;
  return b.startTime.localeCompare(a.startTime);
});
  if (mf !== 'all') trips = trips.filter(t => t.date.startsWith(mf));
  if (tf !== 'all') trips = trips.filter(t => (t.type || 'unknown') === tf);

  document.getElementById('trips-list').innerHTML =
    trips.length ? trips.map(t => tripRowHTML(t)).join('') :
    '<div class="empty-state" style="padding:2rem"><div class="empty-sub">Inga resor matchar filtret.</div></div>';
}

function tripRowHTML(t) {
  const type = t.type || 'unknown';
  const comp = compensationAmount(type, t.km);

  // Matched event info
  const eventInfo = t.matchedEvent
    ? `<div style="font-size:11px;color:var(--text2);margin-top:3px;display:flex;align-items:center;gap:5px">
        <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:var(--text3);flex-shrink:0"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
        ${t.matchedEvent.subject}${t.matchedEvent.location ? ' · ' + t.matchedEvent.location : ''}
      </div>`
    : '';

  return `
    <div class="trip-row">
      <div class="trip-type-dot ${type}"></div>
      <div class="trip-main">
        <div class="trip-title">${t.start} → ${t.end}</div>
        <div class="trip-meta">${fmtDate(t.date)} · ${t.startTime}–${t.endTime}</div>
        ${eventInfo}
      </div>
      <div class="trip-stats">
        <div class="trip-stat"><div class="trip-stat-val">${t.km.toFixed(1)}</div><div class="trip-stat-label">km</div></div>
        <div class="trip-stat"><div class="trip-stat-val">${t.minutes}</div><div class="trip-stat-label">min</div></div>
        ${comp > 0 ? `<div class="trip-stat"><div class="trip-stat-val">${kr(comp)}</div><div class="trip-stat-label">ersättning</div></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <button class="classify-btn work ${type==='work'?'active':''}" onclick="reclassifyTrip(${t.id},'work')" style="font-size:11px;padding:3px 10px">Arbete</button>
        <button class="classify-btn private ${type==='private'?'active':''}" onclick="reclassifyTrip(${t.id},'private')" style="font-size:11px;padding:3px 10px">Privat</button>
      </div>
    </div>`;
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
      const data      = byMonth[m];
      const all       = [...data.work, ...data.private, ...data.unknown];
      const workKm    = data.work.reduce((s,t) => s+t.km, 0);
      const privKm    = data.private.reduce((s,t) => s+t.km, 0);
      const totalKm   = all.reduce((s,t) => s+t.km, 0);
      const totalComp = all.reduce((s,t) => s + compensationAmount(t.type, t.km), 0);
      const d         = new Date(m + '-01');
      const label     = `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}`;

      return `
        <div class="summary-month">
          <div class="summary-month-header" onclick="toggleSummaryMonth('sm-${m}')">
            <div class="summary-month-title">${label}</div>
            <div class="summary-month-kpis">
              <span><strong>${all.length}</strong> resor</span>
              <span><strong>${Math.round(workKm)}</strong> km arbete</span>
              <span><strong>${Math.round(privKm)}</strong> km privat</span>
              <span style="color:var(--work)"><strong>${kr(totalComp)}</strong></span>
            </div>
          </div>
          <div class="summary-month-body" id="sm-${m}">
            <table class="summary-table-inner">
              <thead>
                <tr><th>Datum</th><th>Från</th><th>Till</th><th>Möte</th><th>Km</th><th>Typ</th><th>${compensationTitle()}</th></tr>
              </thead>
              <tbody>
                ${all.sort((a,b) => a.date.localeCompare(b.date)).map(t => {
                  const type = t.type || 'unknown';
                  const c    = compensationAmount(type, t.km);
                  return `<tr>
                    <td>${fmtDate(t.date)}</td>
                    <td>${t.start}</td>
                    <td>${t.end}</td>
                    <td style="font-size:12px;color:var(--text2)">${t.matchedEvent ? t.matchedEvent.subject : '–'}</td>
                    <td>${t.km.toFixed(1)}</td>
                    <td>
                      <div style="display:flex;gap:4px">
                        <button class="classify-btn work ${type==='work'?'active':''}" onclick="reclassifyTrip(${t.id},'work');renderSummary()" style="font-size:10px;padding:2px 7px">A</button>
                        <button class="classify-btn private ${type==='private'?'active':''}" onclick="reclassifyTrip(${t.id},'private');renderSummary()" style="font-size:10px;padding:2px 7px">P</button>
                      </div>
                    </td>
                    <td>${c > 0 ? kr(c) : '–'}</td>
                  </tr>`;
                }).join('')}
                <tr style="font-weight:500;border-top:1px solid var(--border)">
                  <td colspan="4">Totalt</td>
                  <td>${totalKm.toFixed(1)}</td>
                  <td></td>
                  <td>${kr(totalComp)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>`;
    }).join('');
}

function toggleSummaryMonth(id) {
  document.getElementById(id).classList.toggle('open');
}