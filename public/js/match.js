// ─── Match trips against calendar events ─────────────────────────────────────

function analyzeAndMatch() {
  if (!State.volvo.trips.length)    return;
  if (!State.outlook.events.length) return;

  State.volvo.trips = State.volvo.trips.map(trip => {
    const result = classifyTrip(trip);
    return { ...trip, type: result.type, matchedEvent: result.event, driverVerified: result.driverVerified };
  });

  State.analyzed = true;
  renderDashboard();
  renderTrips();
  renderCalendar();
  renderSummary();
  showView('dashboard');
}

function classifyTrip(trip) {
  const tripDate  = trip.date;
  const tripStart = toMinutes(trip.startTime);
  const tripEnd   = toMinutes(trip.endTime);

  // ── Driver verification via GPX ───────────────────────────────────────────
  let driverVerified = null;
  if (typeof gpxTracks !== 'undefined' && gpxTracks.length) {
    driverVerified = verifyDriver(trip);
  }

  // ── Same-day events ───────────────────────────────────────────────────────
  const sameDay = State.outlook.events.filter(e => e.date === tripDate);

  if (sameDay.length) {

    // 1. Exakt platsmatching – resans start/destination mot händelsens plats
    const locationMatch = sameDay.find(e => {
      if (!e.location || e.location.toLowerCase().includes('teams') || e.location.toLowerCase().includes('zoom')) return false;
      const evLoc    = normalizePlace(e.location);
      const tripDest = normalizePlace(trip.end);
      const tripSrc  = normalizePlace(trip.start);
      return evLoc && (tripDest.includes(evLoc) || evLoc.includes(tripDest) ||
                       tripSrc.includes(evLoc)  || evLoc.includes(tripSrc));
    });
    if (locationMatch) {
      return { type: locationMatch.isWork ? 'work' : 'private', event: locationMatch, driverVerified };
    }

    // 2. Privata kategorier → privat resa
    const privateEvent = sameDay.find(e => !e.isWork);
    const workEvents   = sameDay.filter(e => e.isWork);

    // 3. Tidsmässig överlapp med arbetshändelse
    const workOverlap = workEvents.filter(e => {
      if (e.isOnline) return false;
      const evStart = toMinutes(e.startTime);
      const evEnd   = toMinutes(e.endTime);
      // Resa startar under eller strax efter händelsen (90 min buffer för resa till/från)
      return tripStart <= evEnd + 90 && tripEnd >= evStart - 90;
    });
    if (workOverlap.length) return { type: 'work', event: workOverlap[0], driverVerified };

    // 4. Ingen matchning – okänd
    return { type: 'unknown', event: null, driverVerified };
  }

  // ── Angränsande dagar med platsmatching ───────────────────────────────────
  const prev = offsetDate(tripDate, -1);
  const next = offsetDate(tripDate,  1);

  const adjacentLocationMatch = State.outlook.events.find(e => {
    if (e.date !== prev && e.date !== next) return false;
    if (!e.location || e.location.toLowerCase().includes('teams')) return false;
    const evLoc    = normalizePlace(e.location);
    const tripDest = normalizePlace(trip.end);
    return evLoc && (tripDest.includes(evLoc) || evLoc.includes(tripDest));
  });
  if (adjacentLocationMatch) {
    return { type: adjacentLocationMatch.isWork ? 'work' : 'private', event: adjacentLocationMatch, driverVerified };
  }

  return { type: 'unknown', event: null, driverVerified };
}

// ── Normalisera platsnamn för matchning ───────────────────────────────────────
function normalizePlace(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\d+/g, '')           // Ta bort gatunummer
    .replace(/[,\-\/]/g, ' ')     // Ersätt skiljetecken med mellanslag
    .replace(/\s+/g, ' ')         // Normalisera mellanslag
    .trim()
    .split(' ')
    .filter(w => w.length > 3)    // Bara ord längre än 3 tecken
    .join(' ');
}

function toMinutes(timeStr) {
  if (!timeStr || timeStr === '?') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function reclassifyTrip(tripId, type) {
  const trip = State.volvo.trips.find(t => t.id === tripId);
  if (trip) {
    trip.type = type;
    renderTrips();
    renderDashboard();
    renderSummary();
  }
}