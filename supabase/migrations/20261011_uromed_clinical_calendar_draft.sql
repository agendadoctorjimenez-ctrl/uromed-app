-- UROMED ZAM-LP — controlled implementation draft (NOT applied to any database).
-- Review against the live schema and execute only in an approved development branch.
-- This migration is additive except for replacing the appointments RLS policy; validate branch access first.

create schema if not exists integration_private;
revoke all on schema integration_private from public, anon, authenticated;

-- One Google calendar connection for the UROMED clinic (both branches share calendar_id).
create table if not exists integration_private.google_calendar_connection (
  clinic_id uuid primary key references public.clinics(id) on delete restrict,
  calendar_id text not null,
  encrypted_refresh_token text,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_by uuid references auth.users(id),
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  connection_status text not null default 'disconnected'
    check (connection_status in ('disconnected','connected','reauthorization_required','error'))
);

create table if not exists integration_private.google_calendar_oauth_states (
  state_hash text primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists integration_private.google_calendar_event_map (
  appointment_id uuid primary key references public.appointments(id) on delete restrict,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  calendar_id text not null,
  event_id text not null,
  event_etag text,
  local_updated_at timestamptz,
  google_updated_at timestamptz,
  last_synced_at timestamptz,
  sync_status text not null default 'pending'
    check (sync_status in ('pending','synced','conflict','error','deleted_in_google')),
  last_error_code text,
  unique (calendar_id,event_id)
);

create table if not exists integration_private.google_calendar_sync_state (
  clinic_id uuid primary key references public.clinics(id) on delete restrict,
  calendar_id text not null,
  sync_token text,
  channel_id text,
  resource_id text,
  channel_expires_at timestamptz,
  last_incremental_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

-- External events are never linked to patients automatically. They are triaged privately.
create table if not exists integration_private.google_calendar_inbox (
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  calendar_id text not null,
  event_id text not null,
  event_etag text,
  starts_at timestamptz,
  ends_at timestamptz,
  branch text check (branch in ('La Piedad','Zamora')),
  event_status text not null default 'pending'
    check (event_status in ('pending','reviewed','ignored','error')),
  review_reason text not null default 'External event requires administrative review',
  received_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (calendar_id,event_id)
);

create table if not exists integration_private.google_calendar_conflicts (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete restrict,
  calendar_id text not null,
  event_id text not null,
  conflict_type text not null check (conflict_type in ('concurrent_edit','branch_unknown','missing_mapping','remote_deleted','local_deleted')),
  local_snapshot jsonb,
  remote_snapshot jsonb,
  resolution_status text not null default 'pending' check (resolution_status in ('pending','resolved_local','resolved_google','ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table integration_private.google_calendar_connection enable row level security;
alter table integration_private.google_calendar_oauth_states enable row level security;
alter table integration_private.google_calendar_event_map enable row level security;
alter table integration_private.google_calendar_sync_state enable row level security;
alter table integration_private.google_calendar_inbox enable row level security;
alter table integration_private.google_calendar_conflicts enable row level security;
revoke all on all tables in schema integration_private from public, anon, authenticated;

-- Append-only clinical encounter notes. Database timestamp/author are audit evidence,
-- NOT a legally validated advanced electronic signature.
create table if not exists public.uromed_clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  encounter_at timestamptz not null default now(),
  reason text not null check (length(trim(reason)) > 0),
  evolution text not null check (length(trim(evolution)) > 0),
  examination text not null check (length(trim(examination)) > 0),
  diagnosis text not null check (length(trim(diagnosis)) > 0),
  plan text not null check (length(trim(plan)) > 0),
  created_at timestamptz not null default now(),
  signed_at timestamptz,
  signer_name text,
  professional_license text,
  signature_method text check (signature_method in ('session_attestation','qualified_electronic_signature')),
  signature_validation_status text not null default 'pending_legal_validation'
    check (signature_validation_status in ('pending_legal_validation','validated','rejected')),
  supersedes_note_id uuid references public.uromed_clinical_encounters(id) on delete restrict,
  correction_reason text,
  document_sha256 text
);
create index if not exists uromed_clinical_encounters_patient_encounter_idx on public.uromed_clinical_encounters(patient_id, encounter_at desc);
create index if not exists uromed_clinical_encounters_clinic_idx on public.uromed_clinical_encounters(clinic_id, created_at desc);
alter table public.uromed_clinical_encounters enable row level security;
revoke all on public.uromed_clinical_encounters from public, anon, authenticated;
grant select, insert on public.uromed_clinical_encounters to authenticated;

drop policy if exists uromed_encounters_read_same_clinic on public.uromed_clinical_encounters;
create policy uromed_encounters_read_same_clinic on public.uromed_clinical_encounters for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.user_id = (select auth.uid()) and p.clinic_id = clinical_notes.clinic_id and p.active = true
));
create policy uromed_encounters_insert_doctor on public.uromed_clinical_encounters for insert to authenticated
with check (
  author_user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.clinic_id = clinical_notes.clinic_id
      and p.active = true and p.role in ('doctor','admin')
  )
  and exists (
    select 1 from public.patients pt
    where pt.id = clinical_notes.patient_id and pt.clinic_id = clinical_notes.clinic_id
  )
  and signed_at is null
  and signature_validation_status = 'pending_legal_validation'
);

-- Private patient-photo storage. Object path must be <clinic UUID>/<patient UUID>/<random filename>.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('patient-private','patient-private',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists patient_private_photo_read on storage.objects;
create policy patient_private_photo_read on storage.objects for select to authenticated
using (
  bucket_id = 'patient-private'
  and exists (
    select 1 from public.profiles p
    join public.patients pt on pt.clinic_id = p.clinic_id
    where p.user_id = (select auth.uid()) and p.active = true
      and pt.id::text = (storage.foldername(name))[2]
      and p.clinic_id::text = (storage.foldername(name))[1]
  )
);
drop policy if exists patient_private_photo_insert on storage.objects;
create policy patient_private_photo_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'patient-private'
  and exists (
    select 1 from public.profiles p
    join public.patients pt on pt.clinic_id = p.clinic_id
    where p.user_id = (select auth.uid()) and p.active = true
      and p.role in ('doctor','admin')
      and pt.id::text = (storage.foldername(name))[2]
      and p.clinic_id::text = (storage.foldername(name))[1]
  )
);

-- IMPORTANT: This draft deliberately does not alter appointments.patient_id, notes, or backups.
-- It does not install calendar webhooks or start synchronization by itself.
