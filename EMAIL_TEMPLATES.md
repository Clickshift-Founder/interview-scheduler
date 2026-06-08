# SPPG Interview Scheduler — EmailJS Templates
# Copy each template body into EmailJS → Email Templates

=================================================================
TEMPLATE 1: Student Confirmation
Template ID suggestion: template_student_confirm
=================================================================

Subject:
Your SPPG Admissions Interview is Confirmed ✓

Body (HTML):
---
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F1117,#1a2a3a);padding:32px 32px 28px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1BA8A0,#1E88D4);border-radius:10px;padding:10px 18px;font-weight:700;font-size:16px;color:#fff;letter-spacing:0.05em;margin-bottom:14px;">SPPG</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">School of Politics, Policy & Governance</div>
  </div>

  <!-- Body -->
  <div style="padding:32px;">
    <h2 style="font-size:22px;color:#0F1117;margin-bottom:8px;">Interview Confirmed ✓</h2>
    <p style="color:#4A4D58;font-size:15px;line-height:1.7;margin-bottom:24px;">
      Dear <strong>{{to_name}}</strong>,<br><br>
      Your SPPG admissions interview has been successfully scheduled. Please find your interview details below.
    </p>

    <!-- Details Box -->
    <div style="background:#F5F4F0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Date</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">{{interview_date}}</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Time</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">{{interview_time}}</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Panel</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">{{panel_label}}</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Format</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">Video Interview (Zoom)</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;">Duration</td><td style="padding:8px 0;font-weight:600;text-align:right;">15 minutes</td></tr>
      </table>
    </div>

    <!-- Zoom Box -->
    <div style="background:#EBF5F0;border:1px solid #B8DEC9;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9699A6;margin-bottom:10px;">Zoom Meeting Details</div>
      <div style="font-size:15px;font-weight:600;color:#1B6B45;margin-bottom:6px;">{{zoom_url}}</div>
      <div style="font-size:13px;color:#4A4D58;">Meeting ID: <strong>{{zoom_meeting_id}}</strong></div>
      <div style="font-size:13px;color:#4A4D58;">Passcode: <strong>{{zoom_passcode}}</strong></div>
    </div>

    <!-- Tips -->
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;color:#0F1117;margin-bottom:8px;">Preparation Tips</div>
      <ul style="font-size:13px;color:#4A4D58;line-height:1.8;padding-left:18px;">
        <li>Join the Zoom link 5 minutes before your scheduled time</li>
        <li>Ensure you're in a quiet, well-lit environment</li>
        <li>Have a stable internet connection</li>
        <li>Keep your application materials handy for reference</li>
      </ul>
    </div>

    <p style="font-size:13px;color:#4A4D58;line-height:1.7;">
      If you need to reschedule or have any technical issues, please contact us immediately at 
      <a href="mailto:technology@nigeria.thesppg.org" style="color:#1BA8A0;">technology@nigeria.thesppg.org</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F5F4F0;padding:20px 32px;text-align:center;border-top:1px solid #E2DDD4;">
    <div style="font-size:12px;color:#9699A6;line-height:1.6;">
      School of Politics, Policy & Governance (SPPG)<br>
      <a href="mailto:technology@nigeria.thesppg.org" style="color:#1BA8A0;text-decoration:none;">technology@nigeria.thesppg.org</a>
    </div>
  </div>
</div>
---

To: {{to_email}}


=================================================================
TEMPLATE 2: Panelist Notification
Template ID suggestion: template_panelist_notify
=================================================================

Subject:
SPPG Interview Assignment — {{interview_date}} at {{interview_time}}

Body (HTML):
---
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F1117,#1a2a3a);padding:32px 32px 28px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1BA8A0,#1E88D4);border-radius:10px;padding:10px 18px;font-weight:700;font-size:16px;color:#fff;letter-spacing:0.05em;margin-bottom:14px;">SPPG</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Panelist Notification — Admissions Interview</div>
  </div>

  <!-- Body -->
  <div style="padding:32px;">
    <h2 style="font-size:22px;color:#0F1117;margin-bottom:8px;">New Interview Assigned</h2>
    <p style="color:#4A4D58;font-size:15px;line-height:1.7;margin-bottom:24px;">
      Dear <strong>{{to_name}}</strong>,<br><br>
      A student has selected your panel's time slot for their SPPG admissions interview. Please review the details below and ensure you join the Zoom session on time.
    </p>

    <!-- Session Details -->
    <div style="background:#F5F4F0;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9699A6;margin-bottom:12px;">Interview Session</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Date</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">{{interview_date}}</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;border-bottom:1px solid #E2DDD4;">Time</td><td style="padding:8px 0;font-weight:600;text-align:right;border-bottom:1px solid #E2DDD4;">{{interview_time}}</td></tr>
        <tr><td style="padding:8px 0;color:#9699A6;">Panel</td><td style="padding:8px 0;font-weight:600;text-align:right;">{{panel_label}}</td></tr>
      </table>
    </div>

    <!-- Student Details -->
    <div style="background:#EBF5F0;border:1px solid #B8DEC9;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9699A6;margin-bottom:12px;">Student to Interview</div>
      <div style="font-size:16px;font-weight:600;color:#1B6B45;margin-bottom:4px;">{{student_name}}</div>
      <div style="font-size:13px;color:#4A4D58;">{{student_email}}</div>
      <div style="font-size:12px;color:#9699A6;margin-top:8px;">Full application details visible in Airtable under <strong>{{panel_label}}</strong></div>
    </div>

    <!-- Co-Panelists -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9699A6;margin-bottom:8px;">Your Co-Panelists</div>
      <div style="font-size:14px;color:#1D4ED8;">{{co_panelists}}</div>
    </div>

    <!-- Zoom Details -->
    <div style="border:2px solid #1BA8A0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9699A6;margin-bottom:10px;">Zoom Meeting Details</div>
      <div style="font-size:15px;font-weight:600;color:#1BA8A0;margin-bottom:6px;">{{zoom_url}}</div>
      <div style="font-size:13px;color:#4A4D58;">Meeting ID: <strong>{{zoom_meeting_id}}</strong></div>
      <div style="font-size:13px;color:#4A4D58;">Passcode: <strong>{{zoom_passcode}}</strong></div>
    </div>

    <p style="font-size:13px;color:#4A4D58;line-height:1.7;">
      Please log in to Airtable to review the student's full application before the interview. 
      For support, contact <a href="mailto:technology@nigeria.thesppg.org" style="color:#1BA8A0;">technology@nigeria.thesppg.org</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F5F4F0;padding:20px 32px;text-align:center;border-top:1px solid #E2DDD4;">
    <div style="font-size:12px;color:#9699A6;line-height:1.6;">
      School of Politics, Policy & Governance (SPPG)<br>
      <a href="mailto:technology@nigeria.thesppg.org" style="color:#1BA8A0;text-decoration:none;">technology@nigeria.thesppg.org</a>
    </div>
  </div>
</div>
---

To: {{to_email}}

=================================================================
HOW TO ADD IN EMAILJS
=================================================================
1. Log in to emailjs.com
2. Go to Email Templates → Create New Template
3. Paste the Subject and HTML Body above
4. Make sure "To Email" field is set to: {{to_email}}
5. Save — copy the Template ID
6. In SPPG Admin → Settings → EmailJS, paste the Template IDs
7. Your Service ID, Public Key, Private Key go in Vercel env vars

=================================================================
HOW ZOOM LINKS ARE ASSIGNED AUTOMATICALLY
=================================================================
When you have 2 panels running at the same time (same time block):
- Panel Instance 1 in that block → gets Zoom Room A
- Panel Instance 2 in that block → gets Zoom Room B  
- Panel Instance 3 → gets Zoom Room C

This is automatic. Each email going to a student or panelist will
contain the correct Zoom link for their specific panel instance.
You set up the 3 Zoom rooms once in Admin → Zoom Links.
No manual work needed per booking.
