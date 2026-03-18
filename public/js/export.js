// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCSV(monthlySummary = false) {
  if (!State.volvo.trips.length) {
    alert('Inga resor att exportera.');
    return;
  }

  let csv = '';
  const sep = ';';

  if (monthlySummary) {
    // Monthly summary export
    csv  = `Månad${sep}Arbetsresor${sep}Arbets-km${sep}Privatresor${sep}Privat-km${sep}Okl. resor${sep}Okl. km${sep}Total km${sep}Milersättning (kr)\n`;

    const byMonth = {};
    State.volvo.trips.forEach(t => {
      const k = t.date.slice(0, 7);
      if (!byMonth[k]) byMonth[k] = { work:[], private:[], unknown:[] };
      const type = t.type || 'unknown';
      byMonth[k][type === 'work' ? 'work' : type === 'private' ? 'private' : 'unknown'].push(t);
    });

    Object.keys(byMonth).sort().forEach(m => {
      const data   = byMonth[m];
      const d      = new Date(m + '-01');
      const label  = `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}`;
      const workKm = data.work.reduce((s,t) => s+t.km, 0);
      const privKm = data.private.reduce((s,t) => s+t.km, 0);
      const unknKm = data.unknown.reduce((s,t) => s+t.km, 0);
      const comp   = (workKm * State.settings.rateWork).toFixed(2).replace('.', ',');

      csv += [
        label,
        data.work.length,
        workKm.toFixed(1).replace('.', ','),
        data.private.length,
        privKm.toFixed(1).replace('.', ','),
        data.unknown.length,
        unknKm.toFixed(1).replace('.', ','),
        (workKm + privKm + unknKm).toFixed(1).replace('.', ','),
        comp
      ].join(sep) + '\n';
    });

    downloadCSV(csv, 'körjournal-sammanfattning.csv');

  } else {
    // Detailed trip export
    csv = `Datum${sep}Starttid${sep}Sluttid${sep}Från${sep}Till${sep}Km${sep}Minuter${sep}Bränsle (L)${sep}Snittfart${sep}Toppfart${sep}Typ${sep}Matchad händelse${sep}Milersättning (kr)\n`;

    const trips = [...State.volvo.trips].sort((a,b) => a.date.localeCompare(b.date));
    trips.forEach(t => {
      const type = t.type || 'unknown';
      const comp = type === 'work'    ? (t.km * State.settings.rateWork).toFixed(2).replace('.', ',') :
                   type === 'private' ? (t.km * State.settings.ratePrivate).toFixed(2).replace('.', ',') : '0';
      const eventName = t.matchedEvent ? t.matchedEvent.subject : '';

      csv += [
        t.date,
        t.startTime,
        t.endTime,
        `"${t.start}"`,
        `"${t.end}"`,
        t.km.toFixed(1).replace('.', ','),
        t.minutes,
        (t.fuelL || 0).toFixed(1).replace('.', ','),
        t.avgKmh,
        t.maxKmh,
        typeLabel(type),
        `"${eventName}"`,
        comp
      ].join(sep) + '\n';
    });

    downloadCSV(csv, 'körjournal-detaljer.csv');
  }
}

function downloadCSV(content, filename) {
  // Add BOM for Swedish characters in Excel
  const bom     = '\uFEFF';
  const blob    = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
