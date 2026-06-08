// api/email.js — Vercel Serverless Function
// EMAILJS_SERVICE_ID, EMAILJS_PRIVATE_KEY set in Vercel env vars
// Public key is safe in the browser; private key stays here for server sends

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
  const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
  const PUBLIC_KEY  = process.env.EMAILJS_PUBLIC_KEY;

  if (!SERVICE_ID || !PRIVATE_KEY || !PUBLIC_KEY) {
    // Fallback: if not configured, return 200 so app doesn't break — just log
    console.warn('EmailJS env vars not set — email not sent');
    return res.status(200).json({ ok: false, reason: 'EmailJS not configured' });
  }

  const { templateId, params } = req.body;

  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: templateId,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        template_params: params,
      }),
    });

    const text = await r.text();
    return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, status: text });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
