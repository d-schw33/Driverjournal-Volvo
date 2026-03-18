// ─── Match trips against calendar events ─────────────────────────────────────
//
// Logic:
//  1. For each trip, find overlapping or same-day calendar events.
//  2. If the trip time overlaps a work event's day (± buffer), classify as "work".
//  3. If only private events on that day, classify as "private".
//  4. If no events that day, check ±1 day (travel to/from event).
//  5. Otherwise "unknown" – user can reclassify manually.

function analyzeAndMatch() {
  if (!State.volvo.trips.length)   return;
  if (!State.outlook.events.length) return;

  State.volvo.trips = State.volvo.trips.map(trip => {
    const result = classifyTrip(trip);
    return { ...trip, type: result.type, matchedEvent: result.event };
  });

  State.analyzed = true;
  renderDashboard();
  renderTrips();
  renderCalendar();
  renderSummary();
  showView('dashboard');
}

function classifyTrip(trip) {
  const tripDate   = trip.date;            // "2026-03-16"
  const tripStart  = toMinutes(trip.startTime); // minutes since midnight
  const tripEnd    = toMinutes(trip.endTime);

  // ── 1. Same-day events ────────────────────────────────────────────────────
  const sameDay = State.outlook.events.filter(e => e.date === tripDate);

  if (sameDay.length) {
    // Check for time overlap with work events
    const workOverlap = sameDay.filter(e => {
      if (!e.isWork) return false;
      if (e.isOnline) return false; // online meetings don't require driving
      const evStart = toMinutes(e.startTime);
      const evEnd   = toMinutes(e.endTime);
      // Trip must start before event ends and end after event starts (with 120 min buffer)
      return tripStart <= evEnd + 120 && tripEnd >= evStart - 120;
    });
    if (workOverlap.length) return { type: 'work', event: workOverlap[0] };

    // Any work event on same day at all (commute etc)
    const workSameDay = sameDay.filter(e => e.isWork && !e.isOnline);
    if (workSameDay.length) return { type: 'work', event: workSameDay[0] };

    // Only private events
    const privateSameDay = sameDay.filter(e => !e.isWork);
    if (privateSameDay.length && !workSameDay.length) return { type: 'private', event: privateSameDay[0] };
  }

  // ── 2. Adjacent days (travel day before/after event) ─────────────────────
  const prev = offsetDate(tripDate, -1);
  const next = offsetDate(tripDate,  1);

  const adjacentWork = State.outlook.events.find(e =>
    (e.date === prev || e.date === next) && e.isWork && !e.isOnline
  );
  if (adjacentWork) return { type: 'work', event: adjacentWork };

  // ── 3. Location matching ─────────────────────────────────────────────────
  const destWords = trip.end.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);
  const locMatch = State.outlook.events.find(e => {
    if (!e.location) return false;
    const loc = e.location.toLowerCase();
    return destWords.some(w => loc.includes(w));
  });
  if (locMatch) return { type: locMatch.isWork ? 'work' : 'private', event: locMatch };

  return { type: 'unknown', event: null };
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

// ─── Manual reclassify ───────────────────────────────────────────────────────
function reclassifyTrip(tripId, type) {
  const trip = State.volvo.trips.find(t => t.id === tripId);
  if (trip) {
    trip.type = type;
    renderTrips();
    renderDashboard();
    renderSummary();
  }
}
