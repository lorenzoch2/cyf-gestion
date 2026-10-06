-- ════════════════════════════════════════════════════════════════════════════
--  Migración 07 — Documentos con vencimiento
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Lo que caduca ──────────────────────────────────────────────────────────
--  La app no guarda los archivos: viven en la carpeta de la empresa, en
--  OneDrive, que es donde el contador y el banco los van a buscar. Acá va la
--  fecha y dónde está, que es lo único que se olvida.
--
--  `aviso_dias` es cuánto antes conviene empezar el trámite, y cambia mucho
--  según el documento: una patente municipal se renueva con un mes de holgura,
--  pero un certificado de vigencia se pide y llega el mismo día.
create table if not exists documentos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  ambito      text not null default 'empresa'
              check (ambito in ('empresa', 'persona', 'vehiculo')),
  tecnico_id  uuid references tecnicos (id) on delete set null,
  emitido_el  date,
  vence_el    date,
  aviso_dias  integer not null default 30,
  ubicacion   text,
  nota        text,
  archivado   boolean not null default false,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists documentos_por_vencimiento
  on documentos (vence_el) where archivado = false;

-- ─── Permisos ───────────────────────────────────────────────────────────────
do $$
begin
  execute 'alter table documentos enable row level security';
  execute 'drop policy if exists "equipo" on documentos';
  execute 'create policy "equipo" on documentos for all to authenticated
           using (true) with check (true)';
end $$;
