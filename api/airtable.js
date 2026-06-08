// api/airtable.js — Vercel Serverless Function
// Secrets stay here. Browser never sees PAT.
// Set these in Vercel Dashboard → Project → Settings → Environment Variables:
//   AIRTABLE_PAT, AIRTABLE_BASE_ID

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const PAT = process.env.AIRTABLE_PAT;
  const BASE = process.env.AIRTABLE_BASE_ID;

  if (!PAT || !BASE) {
    return res.status(500).json({ error: 'Airtable env vars not configured on Vercel.' });
  }

  const { action, table, emailField, email, recordId, fields } = req.body || req.query;

  const AT_BASE = `https://api.airtable.com/v0/${BASE}`;
  const headers = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'lookup') {
      // Find a student record by email
      const filter = encodeURIComponent(`LOWER({${emailField}})="${email.toLowerCase()}"`);
      const r = await fetch(`${AT_BASE}/${encodeURIComponent(table)}?filterByFormula=${filter}&maxRecords=1`, { headers });
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json(d);
      const record = d.records?.[0] || null;
      return res.json({ record });
    }

    if (action === 'patch') {
      // Update a student record
      const r = await fetch(`${AT_BASE}/${encodeURIComponent(table)}/${recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json(d);
      return res.json({ record: d });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
