// api/email.js — EmailJS proxy
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SERVICE  = process.env.EMAILJS_SERVICE_ID;
  const PUBLIC   = process.env.EMAILJS_PUBLIC_KEY;
  const PRIVATE  = process.env.EMAILJS_PRIVATE_KEY;
  if (!SERVICE || !PUBLIC || !PRIVATE) return res.status(200).json({ ok: false, reason: 'EmailJS not configured' });

  const { templateId, params } = req.body || {};
  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: SERVICE, template_id: templateId, user_id: PUBLIC, accessToken: PRIVATE, template_params: params }),
    });
    const text = await r.text();
    return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, status: text });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}
