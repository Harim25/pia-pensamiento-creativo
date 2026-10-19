-- =====================================================================
-- Bañoticias · Estructura de la base de datos en Supabase
--
-- Cómo usarlo: en Supabase abre SQL Editor → New query, pega TODO este
-- archivo y presiona Run. Se puede volver a correr sin problema.
--
-- Crea:
--   profiles  · una fila por usuario, con su rol (student o staff)
--   reports   · los reportes de los baños
--   bucket report-photos · donde se guardan las fotos
-- y las reglas de seguridad (Row Level Security) para que nadie pueda
-- borrar, editar ni hacerse pasar por otra persona.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  role       text not null default 'student' check (role in ('student', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Cada quien ve su propio perfil" on public.profiles;
create policy "Cada quien ve su propio perfil"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles para usuarios que ya existían antes de correr este script
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- Reportes
-- ---------------------------------------------------------------------

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  restroom_id text not null check (restroom_id ~ '^[0-9]{1,2}[HM]$'),   -- edificio + H/M, por ejemplo '3M'
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  access      text not null check (access in ('abierto', 'cerrado', 'mantenimiento', 'limpieza')),
  supplies    jsonb not null default '{}' check (jsonb_typeof(supplies) = 'object'),  -- { "papel": "si" | "no" | "?" , ... }
  faults      jsonb not null default '{}' check (jsonb_typeof(faults) = 'object'),    -- { "puerta": true | false, ... }
  comment     text check (char_length(comment) <= 280),
  photo_path  text,
  is_staff    boolean not null default false
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_user_recent_idx on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

-- Cualquiera (con o sin sesión) puede ver los reportes
drop policy if exists "Todos pueden ver los reportes" on public.reports;
create policy "Todos pueden ver los reportes"
  on public.reports for select
  to anon, authenticated
  using (true);

-- Solo usuarios con sesión pueden reportar, y solo a su nombre.
-- No hay políticas de update ni delete: nadie puede editar ni borrar reportes desde la página.
drop policy if exists "Usuarios con sesión pueden reportar" on public.reports;
create policy "Usuarios con sesión pueden reportar"
  on public.reports for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Antes de guardar un reporte: fija autor, hora y rol, y aplica los límites anti-spam.
-- Los mensajes de error se muestran tal cual en la página.
create or replace function public.before_report_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  same_restroom integer;
  last_day      integer;
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  new.is_staff   := exists (select 1 from public.profiles where id = auth.uid() and role = 'staff');

  if not new.is_staff then
    select count(*) into same_restroom
      from public.reports
     where user_id = auth.uid()
       and restroom_id = new.restroom_id
       and created_at > now() - interval '10 minutes';
    if same_restroom > 0 then
      raise exception 'Ya reportaste este baño hace poco. Espera unos minutos para volver a reportarlo.';
    end if;

    select count(*) into last_day
      from public.reports
     where user_id = auth.uid()
       and created_at > now() - interval '24 hours';
    if last_day >= 30 then
      raise exception 'Llegaste al límite de 30 reportes por día. Gracias por ayudar; vuelve mañana.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists before_report_insert on public.reports;
create trigger before_report_insert
  before insert on public.reports
  for each row execute function public.before_report_insert();

-- Tiempo real: la página recibe al instante los reportes de otras personas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- Fotos (Supabase Storage)
-- ---------------------------------------------------------------------

-- Bucket público para poder mostrar las fotos; máximo 2 MB y solo imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo puede subir fotos dentro de su propia carpeta (su id)
drop policy if exists "Usuarios con sesión suben fotos a su carpeta" on storage.objects;
create policy "Usuarios con sesión suben fotos a su carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ---------------------------------------------------------------------
-- Cuentas de intendencia
--
-- Para dar acceso a la vista de intendencia, la persona primero crea su
-- cuenta en la página y luego alguien del equipo corre (cambiando el correo):
--
--   update public.profiles set role = 'staff' where email = 'correo@ejemplo.com';
--
-- Para quitarlo:
--
--   update public.profiles set role = 'student' where email = 'correo@ejemplo.com';
-- ---------------------------------------------------------------------
