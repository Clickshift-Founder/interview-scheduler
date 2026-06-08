// api/airtable.js — Airtable proxy (PAT stays server-side)
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const PAT  = process.env.AIRTABLE_PAT;
  const BASE = process.env.AIRTABLE_BASE_ID;
  if (!PAT || !BASE) return res.status(200).json({ ok: false, reason: 'Airtable not configured' });

  const { action, table, emailField, email, recordId, fields } = req.body || {};
  const hdrs = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' };
  const base = `https://api.airtable.com/v0/${BASE}`;

  try {
    if (action === 'lookup') {
      const f = encodeURIComponent(`LOWER({${emailField}})="${email.toLowerCase()}"`);
      const r = await fetch(`${base}/${encodeURIComponent(table)}?filterByFormula=${f}&maxRecords=1`, { headers: hdrs });
      const d = await r.json();
      return res.json({ record: d.records?.[0] || null });
    }
    if (action === 'patch') {
      const r = await fetch(`${base}/${encodeURIComponent(table)}/${recordId}`, {
        method: 'PATCH', headers: hdrs, body: JSON.stringify({ fields }),
      });
      const d = await r.json();
      return res.json({ record: d });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
