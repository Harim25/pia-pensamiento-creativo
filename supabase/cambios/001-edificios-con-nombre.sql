-- =====================================================================
-- Cambio 001 · Permitir edificios con nombre (Biblioteca, Polideportivo)
--
-- La página guarda cada baño como un código de texto: edificio + H/M,
-- por ejemplo '3M', 'BIBH' o 'POLM'. Este cambio se asegura de que la
-- columna reports.restroom_id sea de texto y acepte esos códigos.
--
-- En nuestro proyecto la columna había quedado como uuid (apuntando a la
-- tabla restrooms), así que también quita esa relación. La tabla
-- restrooms no se borra.
--
-- Solo hace falta correrlo una vez: SQL Editor → New query → Run.
-- La tabla reports debe estar vacía o tener solo códigos de texto.
-- =====================================================================

alter table public.reports drop constraint if exists reports_restroom_id_fkey;
alter table public.reports drop constraint if exists reports_restroom_id_check;

alter table public.reports
  alter column restroom_id type text using restroom_id::text;

alter table public.reports
  add constraint reports_restroom_id_check
  check (restroom_id ~ '^[0-9A-Z]{1,5}[HM]$');
