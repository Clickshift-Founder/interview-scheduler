// ═══════════════════════════════════════════════════════════
// STORE — Shared state & persistence (localStorage)
// All pages import this via <script src="/lib/store.js">
// ═══════════════════════════════════════════════════════════

window.STORE = (() => {

  // ── Default state shape ──────────────────────────────────
  const DEFAULTS = {
    version: 3,
    adminPassword: 'admin123',

    // Config
    config: {
      minBlocksRequired: 3,          // Min blocks panelist must select
      interviewDurationMins: 15,     // Each student slot
      bufferMins: 5,                 // Buffer after each interview
      midBreakAfterStudent: 3,       // Force break after N students
      midBreakMins: 15,              // Break duration
      zoomLinks: [
        { label: 'Link A', url: '', meetingId: '', passcode: '' },
        { label: 'Link B', url: '', meetingId: '', passcode: '' },
        { label: 'Link C', url: '', meetingId: '', passcode: '' },
      ],
    },

    // Airtable integration
    airtable: {
      baseId: '',
      table: 'Applications',
      emailField: 'Email',
      interviewDateField: 'Interview Date',
      panelField: 'Video Panels',  // Single select: Panel 1 … Panel 10
    },

    // EmailJS
    emailjs: {
      key: '',
      studentTpl: '',
      panelistTpl: '',
    },

    // ── Core data ────────────────────────────────────────────

    // Panelists: { id, name, email, department?, token }
    panelists: [],

    // Time blocks available for selection by panelists
    // { id, date, shift: 'morning'|'evening'|'sat-morning'|'sat-afternoon', label, startTime, endTime, isWeekend }
    timeBlocks: [],

    // Panelist availability: { id, panelistId, timeBlockId, submittedAt }
    availability: [],

    // Panel instances (dynamically formed)
    // { id, timeBlockId, panelistIds[], label, status: 'forming'|'ready'|'active'|'completed', studentSlots[] }
    // studentSlots: { slotIndex, startTime, studentEmail|null, bookedAt|null }
    panelInstances: [],

    // Students allowed to book: { name, email, bookedInstanceId|null, bookedSlotIndex|null }
    studentEmails: [],

    // Bookings: { id, studentEmail, studentName, instanceId, slotIndex, slotTime, date, panelLabel, panelisIds[], bookedAt, airtableRecordId }
    bookings: [],

    // Activity log: { ts, type, message, meta }
    activityLog: [],
  };

  // ── Persistence ──────────────────────────────────────────
  const KEY = 'ischeduler_v3';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const d = JSON.parse(raw);
      if (d.version !== DEFAULTS.version) return JSON.parse(JSON.stringify(DEFAULTS));
      // Deep merge to pick up new default keys
      return deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), d);
    } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }

  function deepMerge(target, src) {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        if (!target[k]) target[k] = {};
        deepMerge(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
    return target;
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) { console.error('Save failed', e); }
  }

  function get() { return state; }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Activity Log ─────────────────────────────────────────
  function log(type, message, meta = {}) {
    state.activityLog.unshift({ ts: new Date().toISOString(), type, message, meta });
    if (state.activityLog.length > 200) state.activityLog = state.activityLog.slice(0, 200);
    save();
  }

  // ── Panel Instance Engine ────────────────────────────────
  // Rebuild all panel instances from current availability data.
  // Called whenever availability changes.
  function rebuildPanelInstances() {
    // Group availability by timeBlockId
    const groups = {};
    for (const a of state.availability) {
      if (!groups[a.timeBlockId]) groups[a.timeBlockId] = [];
      groups[a.timeBlockId].push(a.panelistId);
    }

    // For each timeBlock, chunk panelists into instances of 2–3
    const newInstances = [];

    for (const [timeBlockId, pIds] of Object.entries(groups)) {
      const block = state.timeBlocks.find(b => b.id === timeBlockId);
      if (!block) continue;

      // Deduplicate
      const unique = [...new Set(pIds)];

      if (unique.length < 2) continue; // Not enough for a panel

      // Chunk: prefer groups of 3, fill with 2
      const chunks = chunkPanelists(unique);

      chunks.forEach((chunk, idx) => {
        // Find existing instance for this block+chunk signature
        const sig = chunk.slice().sort().join('|');
        const existing = state.panelInstances.find(p =>
          p.timeBlockId === timeBlockId &&
          p.panelistIds.slice().sort().join('|') === sig
        );

        if (existing) {
          newInstances.push(existing);
        } else {
          // Create new instance
          const instanceNum = idx + 1;
          const panelLabel = `${block.date}-${block.shift}-${instanceNum}`;
          const slots = generateSlots(block);
          newInstances.push({
            id: uid(),
            timeBlockId,
            panelistIds: chunk,
            label: panelLabel,
            status: 'ready',
            studentSlots: slots,
          });
          log('panel', `Panel instance formed for ${block.label}`, { timeBlockId, panelists: chunk.length });
        }
      });
    }

    // Preserve instances that have bookings even if availability changed
    for (const inst of state.panelInstances) {
      const hasBookings = inst.studentSlots.some(s => s.studentEmail);
      const stillPresent = newInstances.find(n => n.id === inst.id);
      if (hasBookings && !stillPresent) newInstances.push(inst);
    }

    state.panelInstances = newInstances;
    save();
  }

  function chunkPanelists(arr) {
    const chunks = [];
    let i = 0;
    while (i < arr.length) {
      const remaining = arr.length - i;
      if (remaining >= 3) {
        chunks.push(arr.slice(i, i + 3));
        i += 3;
      } else if (remaining === 2) {
        chunks.push(arr.slice(i, i + 2));
        i += 2;
      } else {
        // 1 leftover — attach to last chunk if possible
        if (chunks.length > 0 && chunks[chunks.length - 1].length < 3) {
          chunks[chunks.length - 1].push(arr[i]);
        }
        // else just skip (can be manually added)
        i++;
      }
    }
    return chunks;
  }

  function generateSlots(block) {
    const slots = [];
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);
    const totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    const cfg = state.config;
    const slotSize = cfg.interviewDurationMins + cfg.bufferMins;

    let cursor = startH * 60 + startM;
    let slotIdx = 0;
    let studentCount = 0;

    while (cursor + cfg.interviewDurationMins <= startH * 60 + startM + totalMins) {
      // Insert break after Nth student
      if (studentCount > 0 && studentCount % cfg.midBreakAfterStudent === 0) {
        cursor += cfg.midBreakMins;
      }
      if (cursor + cfg.interviewDurationMins > startH * 60 + startM + totalMins) break;

      const h = Math.floor(cursor / 60);
      const m = cursor % 60;
      const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      slots.push({ slotIndex: slotIdx, startTime: timeStr, studentEmail: null, bookedAt: null });
      slotIdx++;
      studentCount++;
      cursor += slotSize;
    }
    return slots;
  }

  // Expose slot times with human labels
  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  // Get all open (unbuffered) slot times for a given date for student booking
  function getOpenSlotsForDate(dateStr) {
    const instances = state.panelInstances.filter(inst => {
      const block = state.timeBlocks.find(b => b.id === inst.timeBlockId);
      return block && block.date === dateStr && inst.status !== 'completed';
    });

    // Collect open slots per time — group by time string
    const byTime = {};
    for (const inst of instances) {
      for (const slot of inst.studentSlots) {
        if (!slot.studentEmail) {
          if (!byTime[slot.startTime]) byTime[slot.startTime] = [];
          byTime[slot.startTime].push({ instanceId: inst.id, slotIndex: slot.slotIndex });
        }
      }
    }
    return byTime; // { "08:00": [{instanceId, slotIndex}, ...], ... }
  }

  // Book a slot — returns booking or null
  function bookSlot(email, instanceId, slotIndex) {
    const inst = state.panelInstances.find(i => i.id === instanceId);
    if (!inst) return null;
    const slot = inst.studentSlots.find(s => s.slotIndex === slotIndex);
    if (!slot || slot.studentEmail) return null;

    const student = state.studentEmails.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (!student) return null;

    const block = state.timeBlocks.find(b => b.id === inst.timeBlockId);

    slot.studentEmail = email;
    slot.bookedAt = new Date().toISOString();
    student.bookedInstanceId = instanceId;
    student.bookedSlotIndex = slotIndex;

    // Assign a stable panel label for Airtable (Panel 1–10 based on instance index)
    const instIndex = state.panelInstances.indexOf(inst);
    const airtablePanelLabel = `Panel ${(instIndex % 10) + 1}`;

    const booking = {
      id: uid(),
      studentEmail: email,
      studentName: student.name,
      instanceId,
      slotIndex,
      slotTime: slot.startTime,
      date: block.date,
      shift: block.shift,
      blockLabel: block.label,
      panelLabel: airtablePanelLabel,
      panelistIds: inst.panelistIds,
      bookedAt: new Date().toISOString(),
      airtableRecordId: null,
    };
    state.bookings.push(booking);

    // Check if instance fully booked
    if (inst.studentSlots.every(s => s.studentEmail)) inst.status = 'active';

    save();
    log('booking', `${student.name} booked ${formatTime(slot.startTime)} on ${block.date}`, { email, instanceId });
    return booking;
  }

  return { get, save, log, uid, rebuildPanelInstances, getOpenSlotsForDate, bookSlot, formatTime };
})();
