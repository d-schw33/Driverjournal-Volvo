// ─── Match trips against calendar events + location history ──────────────────

function analyzeAndMatch() {
  if (!State.volvo.trips.length)   return;
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

  // ── Check driver via location history ─────────────────────────────────────
  let driverVerified = null;
if (typeof locationHistory !== 'undefined' && locationHistory && locationHistory.length) {
    // Convert trip start to timestamp
    const tripTs = new Date(trip.date + 'T' + trip.startTime + ':00').getTime();
    // Check if user was near start location at trip time (rough coords from address not available,
    // so we check if user was moving/active at that time at all)
    const tripTsEnd = new Date(trip.date + 'T' + trip.endTime + ':00').getTime();
    const userActiveAtTripTime = locationHistory.some(p => {
      return p.ts >= tripTs - 30*60*1000 && p.ts <= tripTsEnd + 30*60*1000;
    });
    driverVerified = userActiveAtTripTime ? 'likely-you' : 'possibly-other';
  }

  // ── Same-day calendar matching ─────────────────────────────────────────────
  const sameDay = State.outlook.events.filter(e => e.date === tripDate);

  if (sameDay.length) {
    const workOverlap = sameDay.filter(e => {
      if (!e.isWork) return false;
      if (e.isOnline) return false;
      const evStart = toMinutes(e.startTime);
      const evEnd   = toMinutes(e.endTime);
      return tripStart <= evEnd + 120 && tripEnd >= evStart - 120;
    });
    if (workOverlap.length) return { type: 'work', event: workOverlap[0], driverVerified };

    const workSameDay = sameDay.filter(e => e.isWork && !e.isOnline);
    if (workSameDay.length) return { type: 'work', event: workSameDay[0], driverVerified };

    const privateSameDay = sameDay.filter(e => !e.isWork);
    if (privateSameDay.length && !workSameDay.length) return { type: 'private', event: privateSameDay[0], driverVerified };
  }

  // ── Adjacent days ──────────────────────────────────────────────────────────
  const prev = offsetDate(tripDate, -1);
  const next = offsetDate(tripDate,  1);
  const adjacentWork = State.outlook.events.find(e =>
    (e.date === prev || e.date === next) && e.isWork && !e.isOnline
  );
  if (adjacentWork) return { type: 'work', event: adjacentWork, driverVerified };

  // ── Location matching ──────────────────────────────────────────────────────
  const destWords = trip.end.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);
  const locMatch  = State.outlook.events.find(e => {
    if (!e.location) return false;
    const loc = e.location.toLowerCase();
    return destWords.some(w => loc.includes(w));
  });
  if (locMatch) return { type: locMatch.isWork ? 'work' : 'private', event: locMatch, driverVerified };

  return { type: 'unknown', event: null, driverVerified };
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