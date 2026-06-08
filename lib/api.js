// lib/api.js — thin wrapper around /api/db, /api/airtable, /api/email
window.API = {
  async db(action, payload = {}) {
    const r = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || 'Request failed');
    return d;
  },

  async airtable(action, payload = {}) {
    try {
      const r = await fetch('/api/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      return await r.json();
    } catch(e) { console.warn('Airtable call failed:', e.message); return { ok: false }; }
  },

  async email(templateId, params) {
    try {
      const r = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, params }),
      });
      return await r.json();
    } catch(e) { console.warn('Email send failed:', e.message); return { ok: false }; }
  },

  formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
  },

  fmtDate(ds) {
    if (!ds) return '';
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  },

  fmtDateLong(ds) {
    if (!ds) return '';
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  },

  fmtTs(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  },

  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },
};
