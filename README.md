# Interview Scheduler

A dynamic panel interview scheduling system. Panelists indicate availability, the engine clusters them into panels, and students book 15-minute slots within those panels.

---

## Routes

| URL | Who uses it |
|-----|-------------|
| `/` | Students — verify email, pick a slot |
| `/panel` | Panelists — indicate availability |
| `/admin` | You — full admin console |

---

## Deploy to Vercel (via VS Code + GitHub)

### 1. Open in VS Code
Open the `interview-scheduler/` folder directly in VS Code (`File → Open Folder`).

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
gh repo create interview-scheduler --private --push --source=.
# or push to an existing repo
```

### 3. Connect Vercel
1. Go to [vercel.com](https://vercel.com) → Import Project → your GitHub repo
2. Framework: **Other** (it's plain HTML + serverless functions)
3. Build command: leave blank
4. Output directory: leave blank (or set to `.`)

### 4. Set Environment Variables in Vercel
Go to your project → **Settings → Environment Variables** and add:

```
AIRTABLE_PAT          = pat_xxxxxxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID      = appXXXXXXXXXXXXXX
EMAILJS_SERVICE_ID    = service_xxxxxxx
EMAILJS_PUBLIC_KEY    = xxxxxxxxxxxxxxxxx
EMAILJS_PRIVATE_KEY   = xxxxxxxxxxxxxxxxx
```

> ⚠️ **Never put these in any file committed to GitHub.** They live only in Vercel's encrypted env var store.

---

## Airtable Setup

Your Applications table needs:
- An `Email` field (or whatever you named it) — used to look up students
- An `Interview Date` field — will be updated when a student books
- A `Video Panels` **Single Select** field with options: `Panel 1`, `Panel 2`, … `Panel 10`

The system patches these two fields automatically on each booking.

---

## EmailJS Setup

1. Create account at [emailjs.com](https://emailjs.com)
2. Add a service (connect your Gmail under **Email Services**)
3. Create two templates:

**Student confirmation template** — variables to use:
```
{{to_name}}, {{interview_date}}, {{interview_time}}, {{panel_label}},
{{zoom_url}}, {{zoom_meeting_id}}, {{zoom_passcode}}
```

**Panelist notification template** — variables to use:
```
{{to_name}}, {{student_name}}, {{student_email}},
{{interview_date}}, {{interview_time}}, {{panel_label}},
{{co_panelists}}, {{zoom_url}}, {{zoom_meeting_id}}, {{zoom_passcode}}
```

4. Copy the Service ID, Public Key, Private Key → Vercel env vars
5. Copy the two Template IDs → Admin → Settings → EmailJS

---

## Admin Workflow

### 1. Add Panelists
Admin → Panelists → Add each person with name + email. Send them the `/panel` link.

### 2. Add Time Blocks
Admin → Time Blocks → Add dates + shift type (Morning/Evening/Saturday). These appear in the panelist portal.

### 3. Panelists Submit Availability
Panelists go to `/panel`, enter their email, select ≥3 blocks, submit.

### 4. Panels Form Automatically
The engine groups panelists by time block. ≥2 sharing a block = a panel instance is formed. Open slots appear on the student calendar.

### 5. Add Students
Admin → Students → add individually, bulk paste, or import CSV.

### 6. Share Booking Link
Send students the base URL (e.g. `https://your-app.vercel.app`). They verify email → pick slot → confirmed.

### 7. Monitor
Admin → Dashboard, Panels, Bookings, Itinerary — full real-time view. Export CSV or print itinerary anytime.

---

## Panel Labeling (Airtable)

Because panels are dynamic, the system assigns `Panel 1`–`Panel 10` labels at booking time (cycling through instances). This maps to your existing `Video Panels` single-select field in Airtable. Once a student is booked, their Airtable record is patched with the label — your existing interface for panelists to log scores/remarks works as before.

---

## Data Storage

All scheduling data (slots, panelists, bookings, panel instances) is stored in the browser's `localStorage` under key `ischeduler_v3`. This means:
- Data persists across refreshes on the same browser/device
- For a shared/persistent database, replace `localStorage` in `lib/store.js` with API calls to a hosted store (e.g. Vercel KV, PlanetScale, or Airtable itself)

---

## Default Admin Password
`admin123` — change immediately after first login via Admin → Settings → Admin Password.
