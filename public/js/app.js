function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = document.getElementById('view-' + name);
  if (view) view.classList.add('active');
  const nav = document.querySelector('.nav-item[data-view="' + name + '"]');
  if (nav) nav.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'trips')     renderTrips();
  if (name === 'calendar')  renderCalendar();
  if (name === 'summary')   renderSummary();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Read URL params BEFORE anything else
  const params     = new URLSearchParams(window.location.search);
  const errorParam = params.get('error');
  window.history.replaceState({}, document.title, '/');

  showView('connect');

  // Show error if redirected with error
  if (errorParam) {
    const errEl = document.createElement('div');
    errEl.style.cssText = 'background:#FCEBEB;color:#791F1F;border:0.5px solid #F7C1C1;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:1rem;';
    errEl.textContent = 'Inloggning misslyckades: ' + decodeURIComponent(errorParam);
    const header = document.querySelector('#view-connect .view-header');
    if (header) header.after(errEl);
    setTimeout(() => errEl.remove(), 8000);
  }

  // Check session – this will also auto-fetch data if connected
  await checkSession();
  await loadSettings();

  // Settings button in sidebar
  const sidebar     = document.querySelector('.sidebar');
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nav-item';
  settingsBtn.style.cssText = 'margin-top:8px;width:100%;text-align:left;background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,0.5);font-family:DM Sans,sans-serif;';
  settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;flex-shrink:0"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg> Inställningar`;
  settingsBtn.onclick = openSettings;
  sidebar.appendChild(settingsBtn);
});