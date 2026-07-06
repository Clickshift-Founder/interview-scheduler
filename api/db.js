// api/db.js — All database operations
// Uses Supabase REST API directly (no npm needed)
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_KEY in Vercel env vars

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not set. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel.' });
  }

  const sb = (table) => `${SB_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  async function query(url, opts = {}) {
    const r = await fetch(url, { headers, ...opts });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!r.ok) throw new Error(typeof data === 'object' ? JSON.stringify(data) : data);
    return data;
  }

  const { action, payload } = req.body || {};

  try {
    switch (action) {

      // ── CONFIG ─────────────────────────────────────────────
      case 'getConfig': {
        const d = await query(`${sb('config')}?id=eq.1`);
        return res.json(d[0] || null);
      }
      case 'saveConfig': {
        const d = await query(`${sb('config')}?id=eq.1`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
        });
        return res.json(d[0]);
      }

      // ── PANELISTS ──────────────────────────────────────────
      case 'getPanelists': {
        const d = await query(`${sb('panelists')}?order=name`);
        return res.json(d);
      }
      case 'addPanelist': {
        const d = await query(sb('panelists'), { method: 'POST', body: JSON.stringify(payload) });
        await logActivity('admin', `Panelist added: ${payload.name}`, {});
        return res.json(d[0]);
      }
      case 'deletePanelist': {
        await query(`${sb('panelists')}?id=eq.${payload.id}`, { method: 'DELETE' });
        await rebuildInstances();
        return res.json({ ok: true });
      }
      case 'lookupPanelist': {
        const d = await query(`${sb('panelists')}?email=ilike.${encodeURIComponent(payload.email)}&limit=1`);
        return res.json(d[0] || null);
      }

      // ── TIME BLOCKS ────────────────────────────────────────
      case 'getTimeBlocks': {
        const d = await query(`${sb('time_blocks')}?order=date,start_time`);
        return res.json(d);
      }
      case 'getVisibleTimeBlocks': {
        // For panelist portal: exclude hidden blocks and blocks whose date has passed
        const today = new Date().toISOString().slice(0, 10);
        const d = await query(
          `${sb('time_blocks')}?hidden_from_panelists=eq.false&date=gte.${today}&order=date,start_time`
        );
        return res.json(d);
      }
      case 'addTimeBlock': {
        const d = await query(sb('time_blocks'), { method: 'POST', body: JSON.stringify(payload) });
        await logActivity('admin', `Time block added: ${payload.shift_label} on ${payload.date}`, {});
        return res.json(d[0]);
      }
      case 'toggleHideBlock': {
        // Admin can hide/show a block from panelist view
        const blk = (await query(`${sb('time_blocks')}?id=eq.${payload.id}`))[0];
        if (!blk) throw new Error('Block not found');
        const newHidden = !blk.hidden_from_panelists;
        const d = await query(`${sb('time_blocks')}?id=eq.${payload.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ hidden_from_panelists: newHidden }),
        });
        await logActivity('admin', `Time block ${newHidden ? 'hidden from' : 'shown to'} panelists: ${blk.label}`, {});
        return res.json(d[0]);
      }
      case 'deleteTimeBlock': {
        const bks = await query(`${sb('bookings')}?instance_id=in.(${await getInstanceIdsForBlock(payload.id)})`);
        if (bks.length > 0) throw new Error('Cannot delete — has bookings');
        await query(`${sb('time_blocks')}?id=eq.${payload.id}`, { method: 'DELETE' });
        await rebuildInstances();
        return res.json({ ok: true });
      }

      // ── PANELIST ITINERARY ─────────────────────────────────
      case 'getPanelistItinerary': {
        // Returns all bookings for sessions this panelist is assigned to
        const { panelistId } = payload;
        const allInsts = await query(
          `${sb('panel_instances')}?order=created_at`
        );
        // Filter instances this panelist is in
        const myInsts = allInsts.filter(i => i.panelist_ids.includes(panelistId));
        if (!myInsts.length) return res.json([]);

        const instIds = myInsts.map(i => i.id);
        const blocks = await query(`${sb('time_blocks')}?order=date,start_time`);
        const blockMap = Object.fromEntries(blocks.map(b => [b.id, b]));

        // Get all bookings for these instances
        const bookings = await query(
          `${sb('bookings')}?instance_id=in.(${instIds.join(',')})&order=date,slot_time`
        );

        // Get config for zoom links
        const cfg = (await query(`${sb('config')}?id=eq.1`))[0];
        const zoomLinks = cfg.zoom_links || [];

        // Build itinerary: group by date+block, attach student info
        const itinerary = myInsts.map(inst => {
          const blk = blockMap[inst.time_block_id];
          if (!blk) return null;
          const instBookings = bookings.filter(b => b.instance_id === inst.id);
          const zoom = zoomLinks[inst.zoom_index] || zoomLinks[0] || {};
          // co-panelist IDs (exclude self) — names fetched client side from panelist list
          const coPanelistIds = inst.panelist_ids.filter(pid => pid !== panelistId);
          return {
            instanceId: inst.id,
            status: inst.status,
            panelLabel: inst.airtable_panel_label || '',
            date: blk.date,
            shiftLabel: blk.shift_label,
            startTime: blk.start_time,
            endTime: blk.end_time,
            zoom,
            coPanelistIds,
            students: instBookings.map(b => ({
              name: b.student_name,
              email: b.student_email,
              slotTime: b.slot_time,
              panelLabel: b.panel_label,
            })),
            totalSlots: inst.student_slots ? inst.student_slots.length : 0,
            bookedSlots: instBookings.length,
          };
        }).filter(Boolean);

        // Sort by date then startTime
        itinerary.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        return res.json(itinerary);
      }

      // ── AVAILABILITY ───────────────────────────────────────
      case 'getAvailability': {
        const d = await query(`${sb('availability')}?order=submitted_at`);
        return res.json(d);
      }
      case 'getPanelistAvailability': {
        const d = await query(`${sb('availability')}?panelist_id=eq.${payload.panelistId}`);
        return res.json(d);
      }
      case 'submitAvailability': {
        // Upsert multiple blocks
        const rows = payload.blockIds.map(bid => ({
          panelist_id: payload.panelistId,
          time_block_id: bid,
        }));
        const existing = await query(`${sb('availability')}?panelist_id=eq.${payload.panelistId}`);
        const existingBlockIds = existing.map(e => e.time_block_id);
        const newRows = rows.filter(r => !existingBlockIds.includes(r.time_block_id));
        if (newRows.length > 0) {
          await query(sb('availability'), { method: 'POST', body: JSON.stringify(newRows) });
        }
        await logActivity('availability', `${payload.panelistName} submitted ${newRows.length} availability blocks`, {});
        const result = await rebuildInstances();
        return res.json({ added: newRows.length, instances: result });
      }

      // ── PANEL INSTANCES ────────────────────────────────────
      case 'getInstances': {
        const d = await query(`${sb('panel_instances')}?order=created_at`);
        return res.json(d);
      }
      case 'addPanelistToInstance': {
        const inst = (await query(`${sb('panel_instances')}?id=eq.${payload.instanceId}`))[0];
        if (!inst) throw new Error('Instance not found');
        if (inst.panelist_ids.length >= 3) throw new Error('Max 3 panelists per panel');
        const newIds = [...inst.panelist_ids, payload.panelistId];
        const newStatus = newIds.length >= 2 ? 'ready' : 'forming';
        const d = await query(`${sb('panel_instances')}?id=eq.${payload.instanceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ panelist_ids: newIds, status: newStatus, updated_at: new Date().toISOString() }),
        });
        await logActivity('admin', `Panelist manually added to panel instance`, { instanceId: payload.instanceId });
        return res.json(d[0]);
      }
      case 'markInstanceComplete': {
        const d = await query(`${sb('panel_instances')}?id=eq.${payload.instanceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() }),
        });
        return res.json(d[0]);
      }

      // ── STUDENT EMAILS ─────────────────────────────────────
      case 'getStudents': {
        const d = await query(`${sb('student_emails')}?order=name`);
        return res.json(d);
      }
      case 'addStudents': {
        // Upsert array
        const d = await query(sb('student_emails'), {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation,resolution=ignore-duplicates' },
          body: JSON.stringify(payload.students),
        });
        await logActivity('admin', `${payload.students.length} student(s) added`, {});
        return res.json({ added: Array.isArray(d) ? d.length : 0 });
      }
      case 'deleteStudent': {
        await query(`${sb('student_emails')}?email=eq.${encodeURIComponent(payload.email)}`, { method: 'DELETE' });
        return res.json({ ok: true });
      }
      case 'lookupStudent': {
        const d = await query(`${sb('student_emails')}?email=ilike.${encodeURIComponent(payload.email)}&limit=1`);
        return res.json(d[0] || null);
      }
      case 'clearUnbookedStudents': {
        await query(`${sb('student_emails')}?booked_instance_id=is.null`, { method: 'DELETE' });
        return res.json({ ok: true });
      }

      // ── OPEN SLOTS (for student booking page) ──────────────
      case 'getOpenSlots': {
        // Returns { date: { time: [{instanceId, slotIndex, zoomIndex}] } }
        const instances = await query(`${sb('panel_instances')}?status=neq.completed&order=created_at`);
        const blocks = await query(`${sb('time_blocks')}?order=date`);
        const blockMap = Object.fromEntries(blocks.map(b => [b.id, b]));

        const result = {};
        for (const inst of instances) {
          if (inst.panelist_ids.length < 2) continue; // forming, not ready
          const blk = blockMap[inst.time_block_id];
          if (!blk) continue;
          const date = blk.date;
          if (!result[date]) result[date] = {};
          for (const slot of inst.student_slots) {
            if (slot.studentEmail) continue; // booked
            const t = slot.startTime;
            if (!result[date][t]) result[date][t] = [];
            result[date][t].push({ instanceId: inst.id, slotIndex: slot.slotIndex, zoomIndex: inst.zoom_index, shift: blk.shift, shiftLabel: blk.shift_label });
          }
        }
        return res.json(result);
      }

      // ── BOOKING ────────────────────────────────────────────
      case 'bookSlot': {
        const { email, instanceId, slotIndex } = payload;

        // Check already booked
        const alreadyBooked = await query(`${sb('bookings')}?student_email=eq.${encodeURIComponent(email)}&limit=1`);
        if (alreadyBooked.length > 0) throw new Error('Already booked');

        // Lock the slot (check it's still free)
        const inst = (await query(`${sb('panel_instances')}?id=eq.${instanceId}`))[0];
        if (!inst) throw new Error('Panel instance not found');
        const slots = inst.student_slots;
        const slot = slots.find(s => s.slotIndex === slotIndex);
        if (!slot || slot.studentEmail) throw new Error('Slot already taken');

        // Get student
        const student = (await query(`${sb('student_emails')}?email=ilike.${encodeURIComponent(email)}&limit=1`))[0];
        if (!student) throw new Error('Student not found');

        // Get block
        const blk = (await query(`${sb('time_blocks')}?id=eq.${inst.time_block_id}`))[0];
        if (!blk) throw new Error('Time block not found');

        // Assign Airtable panel label
        const allInsts = await query(`${sb('panel_instances')}?order=created_at`);
        const instIndex = allInsts.findIndex(i => i.id === instanceId);
        const airtablePanelLabel = `Panel ${(instIndex % 10) + 1}`;

        // Mark slot booked in instance
        slot.studentEmail = email;
        slot.bookedAt = new Date().toISOString();
        await query(`${sb('panel_instances')}?id=eq.${instanceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ student_slots: slots, status: slots.every(s => s.studentEmail) ? 'active' : inst.status, updated_at: new Date().toISOString() }),
        });

        // Create booking record
        const booking = {
          student_email: email,
          student_name: student.name,
          instance_id: instanceId,
          slot_index: slotIndex,
          slot_time: slot.startTime,
          date: blk.date,
          shift: blk.shift,
          block_label: blk.label,
          panel_label: airtablePanelLabel,
          panelist_ids: inst.panelist_ids,
          airtable_record_id: student.airtable_record_id || '',
        };
        const bk = (await query(sb('bookings'), { method: 'POST', body: JSON.stringify(booking) }))[0];

        // Update student record
        await query(`${sb('student_emails')}?id=eq.${student.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ booked_instance_id: instanceId, booked_slot_index: slotIndex }),
        });

        await logActivity('booking', `${student.name} booked ${slot.startTime} on ${blk.date}`, { email });

        // Get config + panelists for emails
        const cfg = (await query(`${sb('config')}?id=eq.1`))[0];
        const panelists = await query(`${sb('panelists')}?id=in.(${inst.panelist_ids.join(',')})`);
        const zoomLinks = cfg.zoom_links || [];
        const zoom = zoomLinks[inst.zoom_index] || zoomLinks[0] || {};

        return res.json({ booking: bk, panelists, zoom, config: cfg, airtablePanelLabel });
      }

      // ── BOOKINGS LIST ──────────────────────────────────────
      case 'getBookings': {
        const d = await query(`${sb('bookings')}?order=date,slot_time`);
        return res.json(d);
      }
      case 'manualAssign': {
        // Same as bookSlot but admin-triggered
        const { email, instanceId, slotIndex } = payload;
        const student = (await query(`${sb('student_emails')}?email=ilike.${encodeURIComponent(email)}&limit=1`))[0];
        if (!student) throw new Error('Student not found in database');
        const inst = (await query(`${sb('panel_instances')}?id=eq.${instanceId}`))[0];
        if (!inst) throw new Error('Instance not found');
        const slots = inst.student_slots;
        const slot = slots.find(s => s.slotIndex === slotIndex);
        if (!slot || slot.studentEmail) throw new Error('Slot taken or not found');
        const blk = (await query(`${sb('time_blocks')}?id=eq.${inst.time_block_id}`))[0];
        const allInsts = await query(`${sb('panel_instances')}?order=created_at`);
        const instIndex = allInsts.findIndex(i => i.id === instanceId);
        const airtablePanelLabel = `Panel ${(instIndex % 10) + 1}`;
        slot.studentEmail = email; slot.bookedAt = new Date().toISOString();
        await query(`${sb('panel_instances')}?id=eq.${instanceId}`, { method: 'PATCH', body: JSON.stringify({ student_slots: slots, updated_at: new Date().toISOString() }) });
        const booking = { student_email: email, student_name: student.name, instance_id: instanceId, slot_index: slotIndex, slot_time: slot.startTime, date: blk.date, shift: blk.shift, block_label: blk.label, panel_label: airtablePanelLabel, panelist_ids: inst.panelist_ids, airtable_record_id: student.airtable_record_id || '' };
        await query(sb('bookings'), { method: 'POST', body: JSON.stringify(booking) });
        await query(`${sb('student_emails')}?id=eq.${student.id}`, { method: 'PATCH', body: JSON.stringify({ booked_instance_id: instanceId, booked_slot_index: slotIndex }) });
        await logActivity('admin', `Manual assignment: ${student.name} → ${airtablePanelLabel}`, { email });
        return res.json({ ok: true, panelLabel: airtablePanelLabel });
      }

      // ── ACTIVITY LOG ───────────────────────────────────────
      case 'getLog': {
        const d = await query(`${sb('activity_log')}?order=created_at.desc&limit=100`);
        return res.json(d);
      }
      case 'clearLog': {
        await query(sb('activity_log'), { method: 'DELETE' });
        return res.json({ ok: true });
      }
      case 'addLog': {
        await logActivity(payload.type, payload.message, payload.meta || {});
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error('DB error:', e);
    return res.status(500).json({ error: e.message });
  }

  // ── Helpers ─────────────────────────────────────────────────
  async function logActivity(type, message, meta) {
    try {
      await fetch(sb('activity_log'), {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ type, message, meta }),
      });
    } catch(e) { console.warn('Log failed:', e.message); }
  }

  async function getInstanceIdsForBlock(blockId) {
    const insts = await query(`${sb('panel_instances')}?time_block_id=eq.${blockId}`);
    return insts.length ? insts.map(i => i.id).join(',') : "'00000000-0000-0000-0000-000000000000'";
  }

  async function rebuildInstances() {
    // Load all data
    const avail = await query(`${sb('availability')}?order=submitted_at`);
    const blocks = await query(`${sb('time_blocks')}?order=date,start_time`);
    const existingInsts = await query(`${sb('panel_instances')}?order=created_at`);
    const cfg = (await query(`${sb('config')}?id=eq.1`))[0];

    // Group availability by time_block_id
    const groups = {};
    for (const a of avail) {
      if (!groups[a.time_block_id]) groups[a.time_block_id] = [];
      groups[a.time_block_id].push(a.panelist_id);
    }

    const blockMap = Object.fromEntries(blocks.map(b => [b.id, b]));
    const newInstances = [];

    for (const [blockId, pIds] of Object.entries(groups)) {
      const blk = blockMap[blockId];
      if (!blk) continue;
      const unique = [...new Set(pIds)];
      const chunks = chunkPanelists(unique);

      chunks.forEach((chunk, idx) => {
        const sig = [...chunk].sort().join('|');
        const existing = existingInsts.find(inst =>
          inst.time_block_id === blockId &&
          [...inst.panelist_ids].sort().join('|') === sig
        );
        if (existing) {
          newInstances.push(existing);
        } else {
          const slots = generateSlots(blk, cfg);
          // Assign zoom index = position within this block's instances
          const zoomIdx = idx % 3;
          const inst = {
            time_block_id: blockId,
            panelist_ids: chunk,
            label: `${blk.shift_label} · ${blk.date} · #${idx + 1}`,
            status: chunk.length >= 2 ? 'ready' : 'forming',
            student_slots: slots,
            zoom_index: zoomIdx,
            airtable_panel_label: '',
            updated_at: new Date().toISOString(),
          };
          newInstances.push(inst);
        }
      });

      // Handle "forming" — single panelist blocks
      if (unique.length === 1) {
        const sig = unique[0];
        const existing = existingInsts.find(inst =>
          inst.time_block_id === blockId && inst.panelist_ids.length === 1 && inst.panelist_ids[0] === sig
        );
        if (!existing) {
          const slots = generateSlots(blk, cfg);
          newInstances.push({
            time_block_id: blockId,
            panelist_ids: unique,
            label: `${blk.shift_label} · ${blk.date} · forming`,
            status: 'forming',
            student_slots: slots,
            zoom_index: 0,
            airtable_panel_label: '',
            updated_at: new Date().toISOString(),
          });
        } else {
          newInstances.push(existing);
        }
      }
    }

    // Preserve instances with bookings not in new set
    for (const inst of existingInsts) {
      const hasBookings = inst.student_slots.some(s => s.studentEmail);
      const stillHere = newInstances.find(n => n.id === inst.id);
      if (hasBookings && !stillHere) newInstances.push(inst);
    }

    // Delete old instances that no longer exist and have no bookings
    const toDelete = existingInsts.filter(ei => {
      const inNew = newInstances.find(n => n.id === ei.id);
      const hasBookings = ei.student_slots.some(s => s.studentEmail);
      return !inNew && !hasBookings;
    });
    for (const d of toDelete) {
      await query(`${sb('panel_instances')}?id=eq.${d.id}`, { method: 'DELETE' });
    }

    // Upsert new instances
    const toInsert = newInstances.filter(n => !n.id);
    const toUpdate = newInstances.filter(n => n.id);

    if (toInsert.length > 0) {
      const inserted = await query(sb('panel_instances'), { method: 'POST', body: JSON.stringify(toInsert) });
      if (Array.isArray(inserted)) {
        for (const ins of inserted) {
          await logActivity('panel', `Panel instance formed: ${ins.label} (${ins.status})`, {});
        }
      }
    }
    for (const inst of toUpdate) {
      await query(`${sb('panel_instances')}?id=eq.${inst.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ panelist_ids: inst.panelist_ids, status: inst.status, updated_at: new Date().toISOString() }),
      });
    }

    return await query(`${sb('panel_instances')}?order=created_at`);
  }

  function chunkPanelists(arr) {
    const chunks = [];
    let i = 0;
    while (i < arr.length) {
      const rem = arr.length - i;
      if (rem >= 3) { chunks.push(arr.slice(i, i+3)); i += 3; }
      else if (rem === 2) { chunks.push(arr.slice(i, i+2)); i += 2; }
      else {
        if (chunks.length > 0 && chunks[chunks.length-1].length < 3) chunks[chunks.length-1].push(arr[i]);
        i++;
      }
    }
    return chunks;
  }

  function generateSlots(block, cfg) {
    const slots = [];
    const [startH, startM] = block.start_time.split(':').map(Number);
    const [endH, endM] = block.end_time.split(':').map(Number);
    const totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    // buffer_mins default 10 (updated from 5 after pilot feedback)
    const bufferMins = cfg.buffer_mins ?? 10;
    const slotSize = cfg.interview_duration_mins + bufferMins;
    let cursor = startH * 60 + startM;
    let slotIdx = 0, studentCount = 0;
    while (cursor + cfg.interview_duration_mins <= startH * 60 + startM + totalMins) {
      if (studentCount > 0 && studentCount % cfg.mid_break_after_student === 0) cursor += cfg.mid_break_mins;
      if (cursor + cfg.interview_duration_mins > startH * 60 + startM + totalMins) break;
      const h = Math.floor(cursor/60), m = cursor%60;
      slots.push({ slotIndex: slotIdx, startTime: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, studentEmail: null, bookedAt: null });
      slotIdx++; studentCount++; cursor += slotSize;
    }
    return slots;
  }
}
