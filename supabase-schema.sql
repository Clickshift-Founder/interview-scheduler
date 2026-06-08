-- ============================================================
-- SPPG Interview Scheduler — Supabase Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Config (single row) ──────────────────────────────────────
create table if not exists config (
  id int primary key default 1,
  min_blocks_required int default 3,
  interview_duration_mins int default 15,
  buffer_mins int default 5,
  mid_break_after_student int default 3,
  mid_break_mins int default 15,
  zoom_links jsonb default '[
    {"label":"A","url":"","meetingId":"","passcode":""},
    {"label":"B","url":"","meetingId":"","passcode":""},
    {"label":"C","url":"","meetingId":"","passcode":""}
  ]'::jsonb,
  airtable_base_id text default '',
  airtable_table text default 'Applications',
  airtable_email_field text default 'Email',
  airtable_date_field text default 'Interview Date',
  emailjs_student_tpl text default '',
  emailjs_panelist_tpl text default '',
  admin_password_hash text default 'admin123',
  updated_at timestamptz default now()
);

-- Seed single config row
insert into config (id) values (1) on conflict (id) do nothing;

-- ── Panelists ────────────────────────────────────────────────
create table if not exists panelists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  department text default '',
  created_at timestamptz default now()
);

-- ── Time Blocks ──────────────────────────────────────────────
create table if not exists time_blocks (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  shift text not null check (shift in ('morning','evening','sat-morning','sat-afternoon')),
  shift_label text not null,
  start_time text not null,
  end_time text not null,
  label text not null,
  created_at timestamptz default now(),
  unique(date, shift)
);

-- ── Panelist Availability ────────────────────────────────────
create table if not exists availability (
  id uuid primary key default uuid_generate_v4(),
  panelist_id uuid references panelists(id) on delete cascade,
  time_block_id uuid references time_blocks(id) on delete cascade,
  submitted_at timestamptz default now(),
  unique(panelist_id, time_block_id)
);

-- ── Panel Instances ──────────────────────────────────────────
create table if not exists panel_instances (
  id uuid primary key default uuid_generate_v4(),
  time_block_id uuid references time_blocks(id) on delete cascade,
  panelist_ids uuid[] not null default '{}',
  label text not null,
  status text not null default 'forming' check (status in ('forming','ready','active','completed')),
  student_slots jsonb not null default '[]'::jsonb,
  zoom_index int default 0,
  airtable_panel_label text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Student Emails (approved list) ──────────────────────────
create table if not exists student_emails (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  booked_instance_id uuid references panel_instances(id) on delete set null,
  booked_slot_index int,
  airtable_record_id text default '',
  created_at timestamptz default now()
);

-- ── Bookings ─────────────────────────────────────────────────
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  student_email text not null,
  student_name text not null,
  instance_id uuid references panel_instances(id) on delete cascade,
  slot_index int not null,
  slot_time text not null,
  date date not null,
  shift text not null,
  block_label text not null,
  panel_label text not null,
  panelist_ids uuid[] not null default '{}',
  airtable_record_id text default '',
  booked_at timestamptz default now()
);

-- ── Activity Log ─────────────────────────────────────────────
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'admin',
  message text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ── RLS: disable for all (service role only via API proxy) ──
alter table config enable row level security;
alter table panelists enable row level security;
alter table time_blocks enable row level security;
alter table availability enable row level security;
alter table panel_instances enable row level security;
alter table student_emails enable row level security;
alter table bookings enable row level security;
alter table activity_log enable row level security;

-- Allow all from service role (your API proxy uses service key)
create policy "service_all" on config for all using (true);
create policy "service_all" on panelists for all using (true);
create policy "service_all" on time_blocks for all using (true);
create policy "service_all" on availability for all using (true);
create policy "service_all" on panel_instances for all using (true);
create policy "service_all" on student_emails for all using (true);
create policy "service_all" on bookings for all using (true);
create policy "service_all" on activity_log for all using (true);
