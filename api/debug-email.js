// api/debug-email.js
// TEMPORARY debug endpoint — DELETE after fixing
// Hit: POST https://sppginterview.vercel.app/api/debug-email
// with body: { "to": "youremail@gmail.com" }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SERVICE  = process.env.EMAILJS_SERVICE_ID;
  const PUBLIC   = process.env.EMAILJS_PUBLIC_KEY;
  const PRIVATE  = process.env.EMAILJS_PRIVATE_KEY;

  // Report what env vars are present (never log actual values)
  const envCheck = {
    EMAILJS_SERVICE_ID:  SERVICE  ? `✓ set (${SERVICE.slice(0,8)}...)` : '✗ MISSING',
    EMAILJS_PUBLIC_KEY:  PUBLIC   ? `✓ set (${PUBLIC.slice(0,6)}...)`  : '✗ MISSING',
    EMAILJS_PRIVATE_KEY: PRIVATE  ? `✓ set (${PRIVATE.slice(0,6)}...)` : '✗ MISSING',
    SUPABASE_URL:        process.env.SUPABASE_URL        ? '✓ set' : '✗ MISSING',
    SUPABASE_SERVICE_KEY:process.env.SUPABASE_SERVICE_KEY? '✓ set' : '✗ MISSING',
    AIRTABLE_PAT:        process.env.AIRTABLE_PAT        ? '✓ set' : '✗ MISSING',
  };

  if (req.method === 'GET') {
    return res.json({ envCheck, note: 'POST with {"to":"email","templateId":"template_xxx"} to test send' });
  }

  const { to, templateId } = req.body || {};

  if (!to || !templateId) {
    return res.json({ envCheck, error: 'Pass {to, templateId} in POST body to test a send' });
  }

  if (!SERVICE || !PUBLIC || !PRIVATE) {
    return res.json({ envCheck, error: 'EmailJS env vars missing — add them in Vercel → Settings → Environment Variables → Redeploy' });
  }

  // Attempt send
  try {
    const payload = {
      service_id:    SERVICE,
      template_id:   templateId,
      user_id:       PUBLIC,
      accessToken:   PRIVATE,
      template_params: {
        to_email:       to,
        to_name:        'Debug Test',
        interview_date: 'Monday, 15 June 2026',
        interview_time: '10:00 AM',
        panel_label:    'Panel 1',
        zoom_url:       'https://zoom.us/j/test',
        zoom_meeting_id:'123 456 7890',
        zoom_passcode:  'test123',
        student_name:   'Test Student',
        student_email:  'test@test.com',
        co_panelists:   'Dr. Test (test@institution.edu)',
      }
    };

    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    return res.json({
      envCheck,
      emailjs_status: r.status,
      emailjs_response: text,
      success: r.ok,
      message: r.ok ? 'Email sent! Check your inbox.' : 'EmailJS rejected the request — see emailjs_response for reason',
    });
  } catch(e) {
    return res.json({ envCheck, error: e.message });
  }
}
