// ── Google Takeout Location Parser ───────────────────────────────────────────

let locationHistory = [];

function initLocationUpload() {
  const card = document.getElementById('card-location');
  if (!card) return;

  // Check if already uploaded in session
  const stored = sessionStorage.getItem('location_history');
  if (stored) {
    locationHistory = JSON.parse(stored);
    setLocationConnected(locationHistory.length);
  }
}

function handleLocationFile(input) {
  const file = input.files[0];
  if (!file) return;

  const btn = document.getElementById('location-btn');
  setLoading(btn, true, 'Läser fil');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      locationHistory = parseLocationHistory(data);
      sessionStorage.setItem('location_history', JSON.stringify(locationHistory));
      setLocationConnected(locationHistory.length);
    } catch (err) {
      showFormError('location-error', 'Kunde inte läsa filen – kontrollera att det är en giltig Google Takeout JSON-fil.');
    } finally {
      setLoading(btn, false, 'Ladda upp fil');
    }
  };
  reader.readAsText(file);
}

function parseLocationHistory(data) {
  const points = [];

  // Format 1: Records.json { locations: [...] }
  if (data.locations) {
    data.locations.forEach(loc => {
      const ts = parseInt(loc.timestampMs || loc.timestamp);
      const lat = (loc.latitudeE7  || loc.latitude)  / (loc.latitudeE7  ? 1e7 : 1);
      const lng = (loc.longitudeE7 || loc.longitude) / (loc.longitudeE7 ? 1e7 : 1);
      if (ts && lat && lng) {
        points.push({ ts: isNaN(ts) ? new Date(loc.timestamp).getTime() : ts, lat, lng });
      }
    });
  }

  // Format 2: Semantic Location History { timelineObjects: [...] }
  if (data.timelineObjects) {
    data.timelineObjects.forEach(obj => {
      if (obj.placeVisit) {
        const loc = obj.placeVisit.location;
        const dur = obj.placeVisit.duration;
        if (loc && dur) {
          const ts = new Date(dur.startTimestamp || dur.startTimestampMs).getTime();
          points.push({
            ts,
            lat: (loc.latitudeE7 || loc.latitude * 1e7) / 1e7,
            lng: (loc.longitudeE7 || loc.longitude * 1e7) / 1e7,
            name: loc.name || '',
            address: loc.address || ''
          });
        }
      }
      if (obj.activitySegment) {
        const seg = obj.activitySegment;
        const dur = seg.duration;
        if (seg.startLocation && dur) {
          const ts = new Date(dur.startTimestamp || dur.startTimestampMs).getTime();
          points.push({
            ts,
            lat: (seg.startLocation.latitudeE7 || seg.startLocation.latitudeDegrees * 1e7) / 1e7,
            lng: (seg.startLocation.longitudeE7 || seg.startLocation.longitudeDegrees * 1e7) / 1e7
          });
        }
      }
    });
  }

  return points.sort((a, b) => a.ts - b.ts);
}

// ── Check if user was near a location at a given time ────────────────────────
function wasUserNearLocation(lat, lng, timestamp, radiusKm = 50, bufferMinutes = 60) {
  if (!locationHistory.length) return null;

  const bufferMs = bufferMinutes * 60 * 1000;
  const nearby = locationHistory.filter(p => {
    const timeDiff = Math.abs(p.ts - timestamp);
    if (timeDiff > bufferMs) return false;
    const dist = haversineKm(lat, lng, p.lat, p.lng);
    return dist <= radiusKm;
  });

  return nearby.length > 0;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setLocationConnected(count) {
  document.getElementById('location-form').style.display      = 'none';
  document.getElementById('location-connected').style.display = 'block';
  document.getElementById('location-info').textContent        = '✓  ' + count.toLocaleString('sv-SE') + ' platspunkter laddade';
  document.getElementById('location-status-badge').textContent = 'Laddad';
  document.getElementById('location-status-badge').classList.add('connected');
  document.querySelector('#conn-location .conn-dot').classList.replace('disconnected', 'connected');
  document.querySelector('#conn-location .conn-btn').textContent = '✓';
  document.querySelector('#conn-location .conn-btn').disabled = true;
}

function disconnectLocation() {
  locationHistory = [];
  sessionStorage.removeItem('location_history');
  document.getElementById('location-form').style.display      = 'block';
  document.getElementById('location-connected').style.display = 'none';
  document.getElementById('location-status-badge').textContent = 'Ej laddad';
  document.getElementById('location-status-badge').classList.remove('connected');
  document.querySelector('#conn-location .conn-dot').classList.replace('connected', 'disconnected');
  document.querySelector('#conn-location .conn-btn').textContent = 'Ladda upp';
  document.querySelector('#conn-location .conn-btn').disabled = false;
}