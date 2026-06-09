// api/email.js — EmailJS proxy (fixed)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SERVICE  = process.env.EMAILJS_SERVICE_ID;
  const PUBLIC   = process.env.EMAILJS_PUBLIC_KEY;
  const PRIVATE  = process.env.EMAILJS_PRIVATE_KEY;

  // Log env var presence (not values) for debugging
  console.log('[email] env check:', {
    SERVICE:  SERVICE  ? 'SET' : 'MISSING',
    PUBLIC:   PUBLIC   ? 'SET' : 'MISSING',
    PRIVATE:  PRIVATE  ? 'SET' : 'MISSING',
  });

  if (!SERVICE || !PUBLIC || !PRIVATE) {
    console.error('[email] Missing EmailJS env vars');
    return res.status(200).json({
      ok: false,
      reason: 'EmailJS env vars not configured in Vercel. Add EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY.'
    });
  }

  const { templateId, params } = req.body || {};

  if (!templateId) {
    return res.status(200).json({ ok: false, reason: 'No templateId provided' });
  }

  console.log('[email] sending to:', params?.to_email, 'template:', templateId);

  try {
    const payload = {
      service_id:      SERVICE,
      template_id:     templateId,
      user_id:         PUBLIC,
      accessToken:     PRIVATE,
      template_params: params,
    };

    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.log('[email] EmailJS response:', r.status, text);

    return res.status(200).json({ ok: r.ok, status: r.status, response: text });
  } catch(e) {
    console.error('[email] fetch error:', e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
