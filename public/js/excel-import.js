// ── Excel import för Volvo körjournal ─────────────────────────────────────────
// Stöder format från Volvo Cars-appen (svenska kolumnnamn)

function handleExcelFile(input) {
  const file = input.files[0];
  if (!file) return;

  const btn = document.getElementById('excel-import-btn');
  if (btn) setLoading(btn, true, 'Läser fil');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data     = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) throw new Error('Filen är tom eller har fel format.');

      const trips = parseVolvoExcel(rows);
      if (!trips.length) throw new Error('Inga resor hittades. Kontrollera att det är en Volvo körjournal-fil.');

      State.volvo.trips       = trips;
      State.volvo.connected   = true;
      State.volvo.vehicleName = 'Importerad från Excel';
      State.volvo.vin         = 'EXCEL-IMPORT';

      setVolvoConnected('Excel-import · ' + trips.length + ' resor');
      checkBothConnected();

      document.getElementById('excel-import-status').textContent =
        '✓ ' + trips.length + ' resor importerade';

    } catch (err) {
      document.getElementById('excel-import-error').textContent = err.message;
      document.getElementById('excel-import-error').classList.add('visible');
      setTimeout(() => document.getElementById('excel-import-error').classList.remove('visible'), 8000);
    } finally {
      if (btn) setLoading(btn, false, 'Välj Excel-fil');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseVolvoExcel(rows) {
  const pad = n => String(n).padStart(2, '0');
  let id = 1;

  return rows.map(row => {
    // Parse start date/time
    const startRaw = row['Startade'] || row['Start'] || '';
    const endRaw   = row['Stannade'] || row['Slut']  || '';

    let startD = null, endD = null;
    if (startRaw instanceof Date) {
      startD = startRaw;
    } else if (typeof startRaw === 'string' && startRaw) {
      startD = new Date(startRaw);
    }
    if (endRaw instanceof Date) {
      endD = endRaw;
    } else if (typeof endRaw === 'string' && endRaw) {
      endD = new Date(endRaw);
    }

    const durMin = (startD && endD) ? Math.round((endD - startD) / 60000) : 0;

    // Distance
    const kmRaw  = row['Avstånd (km)'] || row['Avstand (km)'] || row['Distance (km)'] || 0;
    const km     = parseFloat(String(kmRaw).replace(',', '.')) || 0;

    // Fuel
    const fuelRaw = row['Bränsleåtgång (liter)'] || row['Bransleforbrukning (liter)'] || row['Fuel (L)'] || 0;
    const fuelL   = parseFloat(String(fuelRaw).replace(',', '.')) || 0;

    // Category
    const kategori = row['Kategori'] || row['Category'] || '';
    let type = null;
    if (kategori.toLowerCase().includes('arbete') || kategori.toLowerCase().includes('work') || kategori.toLowerCase().includes('business')) {
      type = 'work';
    } else if (kategori.toLowerCase().includes('privat') || kategori.toLowerCase().includes('personal')) {
      type = 'private';
    }

    return {
      id:        id++,
      date:      startD ? startD.toISOString().slice(0, 10) : '?',
      startTime: startD ? pad(startD.getHours()) + ':' + pad(startD.getMinutes()) : '?',
      endTime:   endD   ? pad(endD.getHours())   + ':' + pad(endD.getMinutes())   : '?',
      start:     row['Startposition'] || row['Start address'] || 'Start',
      end:       row['Slutdestination'] || row['End address'] || 'Slut',
      km:        Math.round(km * 10) / 10,
      minutes:   durMin,
      fuelL:     Math.round(fuelL * 100) / 100,
      maxKmh:    0,
      avgKmh:    durMin > 0 ? Math.round(km / (durMin / 60)) : 0,
      type:      type,
      note:      row['Anteckningar'] || row['Notes'] || ''
    };
  }).filter(t => t.date !== '?' && t.km > 0);
}