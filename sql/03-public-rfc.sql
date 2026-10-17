-- Actualización reversible para un proyecto UROMED V2 ya creado.
-- Ejecutar una sola vez en SQL Editor del Supabase del doctor.
begin;

alter table public.site_settings
  add column if not exists rfc text not null default '',
  add column if not exists rfc_public boolean not null default false;

create or replace view public.public_card with (security_barrier=true) as
  select biography,
    services,
    case when bank_public then beneficiary else null end as beneficiary,
    case when bank_public then bank else null end as bank,
    case when bank_public then clabe else null end as clabe,
    case when rfc_public then rfc else null end as rfc
  from public.site_settings
  where id=1;

revoke all on public.public_card from public;
grant select on public.public_card to anon, authenticated;

-- Completa domicilios oficiales solo si siguen vacíos; conserva cualquier edición previa.
update public.branches
set address='Enrique Ramírez #57-A, frente al Hospital del Carmen'
where id='LP' and trim(address)='';
update public.branches
set address='Aquiles Serdán Sur #93, esquina con Colón'
where id='ZAM' and trim(address)='';

commit;
