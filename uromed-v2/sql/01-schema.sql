-- Ejecutar UNA VEZ exclusivamente en un proyecto Supabase NUEVO y vacío.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id), name text not null,
 role text not null check (role in ('medico','asistente')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create function private.staff_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid() and active=true
$$;
revoke all on function private.staff_role() from public;
grant execute on function private.staff_role() to authenticated;
create function public.current_staff_role() returns text language sql stable security invoker set search_path='' as $$ select private.staff_role() $$;
revoke all on function public.current_staff_role() from public;
grant execute on function public.current_staff_role() to authenticated;

create table public.branches (
 id text primary key check (id in ('LP','ZAM')), name text not null, address text not null default '',
 phone text not null, hours text not null default '', maps_url text not null default '',
 updated_at timestamptz not null default now()
);
insert into public.branches(id,name,phone) values ('LP','La Piedad','3521327669'),('ZAM','Zamora','3511502304');
create table public.site_settings (
 id integer primary key check(id=1), biography text not null default 'Atención urológica en La Piedad y Zamora.',
 services text not null default 'Consulta de urología;Próstata;Litiasis;Cirugía urológica;Salud sexual;Vacunación VPH',
 beneficiary text not null default '', bank text not null default '', clabe text not null default '' check(clabe='' or clabe ~ '^\d{18}$'),
 bank_public boolean not null default false, psa_threshold numeric not null default 4 check(psa_threshold>0), updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1);
-- Vista pública: nunca revelar datos bancarios no autorizados.
create view public.public_card with (security_barrier=true) as
 select biography, services, case when bank_public then beneficiary else null end beneficiary,
 case when bank_public then bank else null end bank, case when bank_public then clabe else null end clabe from public.site_settings where id=1;
revoke all on public.public_card from public;
grant select on public.public_card to anon,authenticated;
-- Esta vista deliberadamente utiliza permisos de su propietario para proyectar SOLO campos públicos.

create sequence public.patient_folio;
create table public.patients (
 id uuid primary key default gen_random_uuid(), folio text unique not null default ('URO-'||lpad(nextval('public.patient_folio')::text,6,'0')),
 name text not null check(length(trim(name)) between 2 and 200), phone text not null check(phone ~ '^[0-9+ ()-]{7,25}$'),
 birth_date date check(birth_date <= current_date), sex text not null default 'No especificado', contact text not null default '',
 branch_id text not null references public.branches(id), archived boolean not null default false,
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index patients_search on public.patients(lower(name));
create index patients_phone on public.patients(phone);
create table public.medical_notes (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 family_history text not null default '', medical_history text not null default '', surgical_history text not null default '',
 allergies text not null default '', medicines text not null default '', reason text not null, present_illness text not null default '',
 examination text not null default '', diagnosis text not null default '', treatment text not null default '', instructions text not null default '',
 evolution text not null default '', amendment_to uuid references public.medical_notes(id),
 author_id uuid not null references public.profiles(id) default auth.uid(), closed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.laboratories (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 study text not null, study_date date not null, laboratory text not null default '', numeric_value numeric,
 descriptive_value text not null default '', units text not null default '', reference_range text not null default '', observations text not null default '',
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.psa (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id), study_date date not null,
 total numeric not null check(total>=0), free numeric check(free>=0 and free<=total), laboratory text not null default '', observations text not null default '',
 next_review date, reviewed boolean not null default false,
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), patient_id uuid references public.patients(id),
 branch_id text references public.branches(id), title text not null default 'Consulta urológica',
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 status text not null default 'agendada' check(status in ('agendada','confirmada','atendida','cancelada','no asistió')),
 admin_notes text not null default '', source text not null default 'uromed' check(source in ('uromed','google')),
 google_event_id text unique, google_etag text, calendar_revision integer not null default 0 check(calendar_revision>=0), pending_link boolean not null default false,
 sync_status text not null default 'pendiente' check(sync_status in ('pendiente','sincronizada','conflicto','error')),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index appointment_dates on public.appointments(starts_at,branch_id);
create table public.followups (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id), due_date date not null,
 reason text not null, priority text not null default 'normal' check(priority in ('normal','alta','urgente')), responsible text not null default '',
 observations text not null default '', status text not null default 'pendiente' check(status in ('pendiente','completado','cancelado')),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.surgeries (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id), branch_id text not null references public.branches(id),
 diagnosis text not null default '', procedure text not null, surgery_date timestamptz not null, hospital text not null default '',
 status text not null default 'programada' check(status in ('programada','realizada','cancelada')), preop text not null default '', pending text not null default '',
 surgical_note text not null default '', postoperative text not null default '', payment numeric not null default 0 check(payment>=0),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inventory_lots (
 id uuid primary key default gen_random_uuid(), item text not null, kind text not null check(kind in ('vacuna','zoladex','insumo','medicamento')),
 presentation text not null default '', lot text not null, expires_on date not null, branch_id text not null references public.branches(id),
 initial_quantity integer not null check(initial_quantity>=0), quantity integer not null check(quantity>=0), minimum integer not null default 1 check(minimum>=0),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(item,lot,branch_id)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id),
 lot_id uuid not null references public.inventory_lots(id), kind text not null check(kind in ('vacuna','zoladex')),
 dose text not null, applied_at timestamptz not null, next_date date, responsible text not null,
 idempotency_key uuid not null unique, created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now()
);
create table public.inventory_movements (
 id uuid primary key default gen_random_uuid(), lot_id uuid not null references public.inventory_lots(id), delta integer not null check(delta<>0),
 reason text not null, application_id uuid unique references public.applications(id),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now()
);
create table public.clinical_files (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id), laboratory_id uuid references public.laboratories(id),
 purpose text not null default 'documento' check(purpose in ('documento','fotografia','laboratorio','preoperatorio')),
 name text not null, object_path text not null unique, mime text not null check(mime in ('application/pdf','image/jpeg','image/png')),
 created_by uuid references auth.users(id) default auth.uid(), created_at timestamptz not null default now()
);
create table public.audit_log (
 id bigint generated always as identity primary key, table_name text not null, record_id text not null, action text not null,
 actor_id uuid default auth.uid(), occurred_at timestamptz not null default now(), changed_fields text[] not null default '{}'
);
-- Auditoría de campos modificados sin duplicar expedientes ni secretos en logs.
create function private.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
 declare a jsonb; b jsonb; fields text[];
 begin
 a:=case when TG_OP='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 b:=case when TG_OP='DELETE' then '{}'::jsonb else to_jsonb(new) end;
 select array_agg(key) into fields from (select key from jsonb_each(a||b) where a->key is distinct from b->key) x;
 insert into public.audit_log(table_name,record_id,action,changed_fields) values(TG_TABLE_NAME,coalesce(b->>'id',a->>'id'),TG_OP,coalesce(fields,'{}'));
 return coalesce(new,old);
 end $$;
revoke all on function private.audit_row() from public;
create function private.timestamps() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create function private.protect_note() returns trigger language plpgsql set search_path='' as $$
 begin
 if TG_OP='DELETE' then raise exception 'Las notas se conservan; agregar una enmienda.'; end if;
 if TG_OP='UPDATE' and old.closed_at is not null then raise exception 'Nota cerrada: crear una enmienda.'; end if;
 if TG_OP='INSERT' and new.author_id is distinct from auth.uid() then raise exception 'Autor inválido'; end if;
 if TG_OP='UPDATE' and (new.author_id<>old.author_id or new.patient_id<>old.patient_id or new.created_at<>old.created_at) then raise exception 'No se puede cambiar autor, paciente o fecha de creación'; end if;
 if new.closed_at is not null then new.closed_at=now(); end if;
 if new.amendment_to is not null and not exists(select 1 from public.medical_notes where id=new.amendment_to and patient_id=new.patient_id and closed_at is not null) then raise exception 'Enmienda inválida'; end if;
 return new;
 end $$;
create trigger protect_medical_note before insert or update or delete on public.medical_notes for each row execute function private.protect_note();
-- EXCLUDE evita solapamientos incluso con peticiones concurrentes. Un médico, ambas sucursales.
create extension if not exists btree_gist with schema extensions;
alter table public.appointments add constraint no_overlapping_appointments exclude using gist
 (tstzrange(starts_at,ends_at,'[)') with &&) where (status in ('agendada','confirmada'));

-- Integración: solo service_role; ninguna política permite leer tokens desde el navegador.
create table public.calendar_connection (
 id integer primary key check(id=1), encrypted_refresh_token text not null, sync_token text,
 channel_id text, channel_token text, resource_id text, channel_expiry timestamptz,
 lease_until timestamptz, lease_owner uuid, needs_pull boolean not null default true,
 last_sync timestamptz, last_full_sync timestamptz, last_error text, updated_at timestamptz not null default now()
);
create table public.calendar_conflicts (
 id uuid primary key default gen_random_uuid(), appointment_id uuid references public.appointments(id),
 reason text not null, google_snapshot jsonb not null, resolved_at timestamptz, resolution text,
 created_at timestamptz not null default now()
);
create table public.calendar_outbox (
 appointment_id uuid primary key references public.appointments(id), version timestamptz not null, attempts integer not null default 0,
 next_attempt timestamptz not null default now(), last_error text
);
create function private.queue_calendar() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if new.sync_status='pendiente' and (TG_OP='INSERT' or row(new.patient_id,new.branch_id,new.title,new.starts_at,new.ends_at,new.status,new.admin_notes) is distinct from row(old.patient_id,old.branch_id,old.title,old.starts_at,old.ends_at,old.status,old.admin_notes) or old.sync_status<>'pendiente') then
 insert into public.calendar_outbox(appointment_id,version) values(new.id,new.updated_at)
 on conflict(appointment_id) do update set version=excluded.version,attempts=0,next_attempt=now(),last_error=null;
 end if;
 return new;
 end $$;
revoke all on function private.queue_calendar() from public;
create trigger queue_calendar after insert or update on public.appointments for each row execute function private.queue_calendar();
create function public.acquire_calendar_lease(owner_id uuid) returns boolean language plpgsql security invoker set search_path='' as $$
 declare n integer;
 begin update public.calendar_connection set lease_until=now()+interval '4 minutes',lease_owner=owner_id where id=1 and (lease_until is null or lease_until<now()); get diagnostics n=row_count; return n=1; end $$;
revoke all on function public.acquire_calendar_lease(uuid) from public,anon,authenticated;
grant execute on function public.acquire_calendar_lease(uuid) to service_role;

create function public.resolve_calendar_conflict(p_id uuid,p_choice text) returns void language plpgsql security invoker set search_path='' as $$
 declare c public.calendar_conflicts; a public.appointments; e jsonb;
 begin
 if p_choice not in ('google','uromed') then raise exception 'Resolución inválida'; end if;
 select * into c from public.calendar_conflicts where id=p_id and resolved_at is null for update;
 if not found or c.appointment_id is null then raise exception 'Conflicto no resoluble'; end if;
 select * into a from public.appointments where id=c.appointment_id for update;
 if a.sync_status<>'conflicto' then raise exception 'La cita cambió. Actualiza antes de resolver'; end if;
 e=c.google_snapshot;
 if p_choice='uromed' then
 update public.appointments set sync_status='pendiente',google_etag=e->>'etag',google_event_id=case when e->>'status'='cancelled' then null else google_event_id end,calendar_revision=case when e->>'status'='cancelled' then calendar_revision+1 else calendar_revision end where id=a.id;
 elsif e->>'status'='cancelled' then
 update public.appointments set status='cancelada',google_etag=e->>'etag',sync_status='sincronizada' where id=a.id;
 else
 if e#>>'{start,dateTime}' is null or e#>>'{end,dateTime}' is null then raise exception 'Sin horario individual'; end if;
 update public.appointments set starts_at=(e#>>'{start,dateTime}')::timestamptz, ends_at=(e#>>'{end,dateTime}')::timestamptz,
 branch_id=case when e#>>'{extendedProperties,private,branch_id}' in ('LP','ZAM') then e#>>'{extendedProperties,private,branch_id}' when e->>'summary' ~* '\[LP\]' then 'LP' when e->>'summary' ~* '\[ZAM\]' then 'ZAM' else null end,
 pending_link=patient_id is null,google_etag=e->>'etag',sync_status='sincronizada' where id=a.id;
 end if;
 if p_choice='google' then delete from public.calendar_outbox where appointment_id=a.id; end if;
 update public.calendar_conflicts set resolved_at=now(),resolution=p_choice where id=c.id;
 end $$;
revoke all on function public.resolve_calendar_conflict(uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_calendar_conflict(uuid,text) to service_role;

-- Operación atómica e idempotente: registra aplicación y descuenta UNA unidad.
create function private.record_application(p_patient uuid,p_lot uuid,p_kind text,p_dose text,p_at timestamptz,p_next date,p_responsible text,p_key uuid)
 returns uuid language plpgsql security definer set search_path='' as $$
 declare l public.inventory_lots; existing uuid; result uuid;
 begin
 if private.staff_role() is null then raise exception 'Sin permisos'; end if;
 perform pg_advisory_xact_lock(hashtext(p_key::text));
 select id into existing from public.applications where idempotency_key=p_key;
 if existing is not null then
 if not exists(select 1 from public.applications where id=existing and patient_id=p_patient and lot_id=p_lot and kind=p_kind and dose=p_dose and next_date is not distinct from p_next and responsible=p_responsible) then raise exception 'Clave de aplicación ya usada con datos diferentes'; end if;
 return existing; end if;
 select * into l from public.inventory_lots where id=p_lot for update;
 if not found or l.kind<>p_kind then raise exception 'Lote incompatible'; end if;
 if p_at>now()+interval '5 minutes' or (p_at at time zone 'America/Mexico_City')::date > l.expires_on or l.expires_on < (now() at time zone 'America/Mexico_City')::date then raise exception 'Fecha futura o lote caducado'; end if;
 if l.quantity<1 then raise exception 'Sin existencias'; end if;
 if p_next is not null and p_next<(p_at at time zone 'America/Mexico_City')::date then raise exception 'Próxima fecha inválida'; end if;
 insert into public.applications(patient_id,lot_id,kind,dose,applied_at,next_date,responsible,idempotency_key) values(p_patient,p_lot,p_kind,p_dose,p_at,p_next,p_responsible,p_key) returning id into result;
 update public.inventory_lots set quantity=quantity-1 where id=p_lot;
 insert into public.inventory_movements(lot_id,delta,reason,application_id) values(p_lot,-1,'Aplicación confirmada',result);
 return result;
 end $$;
revoke all on function private.record_application(uuid,uuid,text,text,timestamptz,date,text,uuid) from public;
grant execute on function private.record_application(uuid,uuid,text,text,timestamptz,date,text,uuid) to authenticated;
create function public.record_application(p_patient uuid,p_lot uuid,p_kind text,p_dose text,p_at timestamptz,p_next date,p_responsible text,p_key uuid)
 returns uuid language sql security invoker set search_path='' as $$ select private.record_application(p_patient,p_lot,p_kind,p_dose,p_at,p_next,p_responsible,p_key) $$;
revoke all on function public.record_application(uuid,uuid,text,text,timestamptz,date,text,uuid) from public;
grant execute on function public.record_application(uuid,uuid,text,text,timestamptz,date,text,uuid) to authenticated;
create function private.adjust_stock(p_lot uuid,p_delta integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if private.staff_role()<>'medico' or private.staff_role() is null then raise exception 'Solo médico administrador'; end if;
 if p_delta=0 or length(trim(p_reason))<3 then raise exception 'Movimiento inválido'; end if;
 perform 1 from public.inventory_lots where id=p_lot for update;
 if not found then raise exception 'Lote inexistente'; end if;
 update public.inventory_lots set quantity=quantity+p_delta where id=p_lot;
 insert into public.inventory_movements(lot_id,delta,reason) values(p_lot,p_delta,p_reason);
 end $$;
revoke all on function private.adjust_stock(uuid,integer,text) from public;
grant execute on function private.adjust_stock(uuid,integer,text) to authenticated;
create function public.adjust_stock(p_lot uuid,p_delta integer,p_reason text) returns void language sql security invoker set search_path='' as $$ select private.adjust_stock(p_lot,p_delta,p_reason) $$;
revoke all on function public.adjust_stock(uuid,integer,text) from public;
grant execute on function public.adjust_stock(uuid,integer,text) to authenticated;

-- RLS: sin perfil activo, ninguna tabla clínica accesible.
do $$ declare t text; begin
 foreach t in array array['profiles','branches','site_settings','patients','medical_notes','laboratories','psa','appointments','followups','surgeries','inventory_lots','applications','inventory_movements','clinical_files','audit_log','calendar_connection','calendar_conflicts','calendar_outbox'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['patients','appointments','followups','inventory_lots','applications','inventory_movements'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy staff_read on public.%I for select to authenticated using ((select private.staff_role()) is not null)',t);
 end loop;
 foreach t in array array['patients','appointments','followups'] loop
 execute format('grant insert,update on public.%I to authenticated',t);
 execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select private.staff_role()) is not null)',t);
 execute format('create policy staff_update on public.%I for update to authenticated using ((select private.staff_role()) is not null) with check ((select private.staff_role()) is not null)',t);
 end loop;
 foreach t in array array['medical_notes','laboratories','psa','surgeries','clinical_files'] loop
 execute format('grant select,insert,update on public.%I to authenticated',t);
 execute format('create policy doctor_access on public.%I for all to authenticated using ((select private.staff_role())=''medico'') with check ((select private.staff_role())=''medico'')',t);
 end loop;
 foreach t in array array['profiles','site_settings','calendar_conflicts','audit_log'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy doctor_read on public.%I for select to authenticated using ((select private.staff_role())=''medico'')',t);
 end loop;
 foreach t in array array['site_settings','branches'] loop
 execute format('grant update on public.%I to authenticated',t);
 execute format('create policy doctor_update on public.%I for update to authenticated using ((select private.staff_role())=''medico'') with check ((select private.staff_role())=''medico'')',t);
 end loop;
 foreach t in array array['branches','patients','medical_notes','laboratories','psa','appointments','followups','surgeries','inventory_lots','site_settings'] loop
 execute format('create trigger timestamps before update on public.%I for each row execute function private.timestamps()',t);
 end loop;
 foreach t in array array['profiles','branches','site_settings','patients','medical_notes','laboratories','psa','appointments','followups','surgeries','inventory_lots','applications','inventory_movements','clinical_files'] loop
 execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_row()',t);
 end loop;
 foreach t in array array['medical_notes','laboratories','psa','followups','surgeries','applications','clinical_files'] loop
 execute format('create index on public.%I(patient_id)',t);
 end loop;
 end $$;
grant usage,select on sequence public.patient_folio to authenticated,service_role;
grant select on public.branches to anon,authenticated;
create policy public_branches on public.branches for select to anon,authenticated using(true);
-- Perfil propio sin permitir cambio de rol.
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
-- Alta de lotes por administrador: el saldo inicial queda fijado.
grant insert on public.inventory_lots to authenticated;
create policy doctor_lot_insert on public.inventory_lots for insert to authenticated with check((select private.staff_role())='medico' and quantity=initial_quantity);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('clinical','clinical',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy clinical_file_read on storage.objects for select to authenticated using(bucket_id='clinical' and (select private.staff_role())='medico');
create policy clinical_file_upload on storage.objects for insert to authenticated with check(bucket_id='clinical' and (select private.staff_role())='medico' and exists(select 1 from public.patients where id::text=(storage.foldername(storage.objects.name))[1]));
-- Archivos inmutables: no upsert/delete desde cliente.
alter publication supabase_realtime add table public.appointments,public.followups,public.applications,public.inventory_lots;
commit;
