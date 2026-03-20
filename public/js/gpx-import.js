// ── GPX Import – Apple Health / iPhone ───────────────────────────────────────
// Parsar GPX-filer från Apple Hälsa och verifierar förare mot körjournal

let gpxTracks = []; // Array av { ts, lat, lng } sorterade per tid

function handleGpxFiles(input) {
  const files = Array.from(input.files);
  if (!files.length) return;

  const btn = document.getElementById('gpx-import-btn');
  if (btn) setLoading(btn, true, 'Läser GPX-filer');

  let loaded = 0;
  let allPoints = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const points = parseGpxFile(e.target.result);
        allPoints = allPoints.concat(points);
      } catch (err) {
        console.error('GPX parse error:', err);
      }
      loaded++;
      if (loaded === files.length) {
        // Sort all points by time
        allPoints.sort((a, b) => a.ts - b.ts);
        gpxTracks = allPoints;

        // Re-verify driver on existing trips if already loaded
        if (State.volvo.trips.length) {
          State.volvo.trips = State.volvo.trips.map(trip => ({
            ...trip,
            driverVerified: verifyDriver(trip)
          }));
          if (State.analyzed) {
            renderDashboard();
            renderTrips();
          }
        }

        setGpxConnected(files.length, allPoints.length);
        if (btn) setLoading(btn, false, 'Ladda upp GPX-filer');
      }
    };
    reader.readAsText(file);
  });
}

function parseGpxFile(xmlText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, 'application/xml');
  const points = [];

  doc.querySelectorAll('trkpt').forEach(pt => {
    const lat  = parseFloat(pt.getAttribute('lat'));
    const lon  = parseFloat(pt.getAttribute('lon'));
    const time = pt.querySelector('time')?.textContent;
    if (lat && lon && time) {
      points.push({ ts: new Date(time).getTime(), lat, lng: lon });
    }
  });

  return points;
}

// ── Verify if user was in/near the car during a trip ─────────────────────────
function verifyDriver(trip) {
  if (!gpxTracks.length) return null;

  const startTs = new Date(trip.date + 'T' + trip.startTime + ':00').getTime();
  const endTs   = new Date(trip.date + 'T' + trip.endTime   + ':00').getTime();
  const buffer  = 10 * 60 * 1000; // 10 minutes buffer

  // Find GPS points near trip start time
  const startPoints = gpxTracks.filter(p =>
    p.ts >= startTs - buffer && p.ts <= startTs + buffer
  );

  // Find GPS points near trip end time
  const endPoints = gpxTracks.filter(p =>
    p.ts >= endTs - buffer && p.ts <= endTs + buffer
  );

  if (!startPoints.length && !endPoints.length) {
    return 'no-data'; // No GPS data for this time period
  }

  // Parse trip start/end coordinates from address (approximate using known coords)
  // Since we don't have exact coords from the address string, we check if user was
  // moving at all during the trip (speed > 0.5 m/s indicates travel)
  const duringTrip = gpxTracks.filter(p =>
    p.ts >= startTs - buffer && p.ts <= endTs + buffer
  );

  if (!duringTrip.length) return 'no-data';

  // Check if user was moving during trip (indicates they were in a vehicle)
  const movingPoints = duringTrip.filter((p, i) => {
    if (i === 0) return false;
    const prev = duringTrip[i - 1];
    const dist = haversineM(p.lat, p.lng, prev.lat, prev.lng);
    const time = (p.ts - prev.ts) / 1000; // seconds
    const speed = time > 0 ? dist / time : 0; // m/s
    return speed > 1.0; // Moving faster than 1 m/s (~3.6 km/h)
  });

  const movingRatio = movingPoints.length / duringTrip.length;

  if (movingRatio > 0.3) return 'likely-you';    // User was moving during trip
  if (movingRatio > 0.1) return 'possibly-you';  // Some movement
  return 'possibly-other';                        // User was stationary
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R    = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setGpxConnected(fileCount, pointCount) {
  document.getElementById('gpx-form').style.display      = 'none';
  document.getElementById('gpx-connected').style.display = 'block';
  document.getElementById('gpx-info').textContent =
    '✓  ' + fileCount + ' fil' + (fileCount > 1 ? 'er' : '') +
    ' · ' + pointCount.toLocaleString('sv-SE') + ' GPS-punkter';
  document.getElementById('gpx-status-badge').textContent = 'Laddad';
  document.getElementById('gpx-status-badge').classList.add('connected');
  document.querySelector('#conn-gpx .conn-dot').classList.replace('disconnected', 'connected');
  document.querySelector('#conn-gpx .conn-btn').textContent = '✓';
  document.querySelector('#conn-gpx .conn-btn').disabled = true;
}

function disconnectGpx() {
  gpxTracks = [];
  document.getElementById('gpx-form').style.display      = 'block';
  document.getElementById('gpx-connected').style.display = 'none';
  document.getElementById('gpx-status-badge').textContent = 'Ej laddad';
  document.getElementById('gpx-status-badge').classList.remove('connected');
  document.querySelector('#conn-gpx .conn-dot').classList.replace('connected', 'disconnected');
  document.querySelector('#conn-gpx .conn-btn').textContent = 'Ladda upp';
  document.querySelector('#conn-gpx .conn-btn').disabled = false;

  // Remove driver verification from trips
  State.volvo.trips = State.volvo.trips.map(t => ({ ...t, driverVerified: null }));
  if (State.analyzed) { renderTrips(); renderDashboard(); }
}

// ── Driver badge helper (used by ui.js) ──────────────────────────────────────
function driverBadgeHTML(driverVerified) {
  if (!driverVerified || driverVerified === 'no-data') return '';
  const map = {
    'likely-you':    { label: 'Du körde troligen',    bg: '#EAF3DE', color: '#27500A', border: '#C0DD97' },
    'possibly-you':  { label: 'Möjligen du',          bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
    'possibly-other':{ label: 'Möjligen annan förare', bg: '#FCEBEB', color: '#791F1F', border: '#F7C1C1' }
  };
  const s = map[driverVerified];
  if (!s) return '';
  return `<span class="badge" style="background:${s.bg};color:${s.color};border-color:${s.border}">${s.label}</span>`;
}