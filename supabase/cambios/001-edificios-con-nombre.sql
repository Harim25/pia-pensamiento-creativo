-- =====================================================================
-- Cambio 001 · Permitir edificios con nombre (Biblioteca, Polideportivo)
--
-- Antes, los reportes solo aceptaban baños con número ('3M'). Ahora
-- también aceptan claves con letras, como 'BIBH' o 'POLM'.
--
-- Solo hace falta correrlo una vez, en SQL Editor → New query → Run,
-- en una base de datos donde ya se había corrido schema.sql.
-- =====================================================================

alter table public.reports drop constraint if exists reports_restroom_id_check;

alter table public.reports
  add constraint reports_restroom_id_check
  check (restroom_id ~ '^[0-9A-Z]{1,5}[HM]$');
