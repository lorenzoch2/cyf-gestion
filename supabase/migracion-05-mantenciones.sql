-- ════════════════════════════════════════════════════════════════════════════
--  Migración 05 — Mantenciones programadas
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Va después de migracion-03-inventario.sql, porque una mantención se le
--  asigna a un técnico.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── La visita que todavía no ocurre ────────────────────────────────────────
--  `visitas` es la bitácora de lo que ya pasó. Esta tabla es lo contrario: lo
--  que hay que ir a hacer y cuándo. Separarlas evita la tentación de anotar
--  una visita futura como si ya hubiera ocurrido.
--
--  `equipo_id` nulo significa «todo el local»: en un minimarket con cuatro
--  splits se programa una visita, no cuatro.
--
--  `frecuencia_meses` viaja en la mantención y no sólo en el contrato, porque
--  una cámara de frío de un restaurante se ve cada tres meses aunque el resto
--  del local sea semestral.
create table if not exists mantenciones (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clientes (id) on delete cascade,
  equipo_id        uuid references equipos (id) on delete set null,
  contrato_id      uuid references contratos (id) on delete set null,
  tecnico_id       uuid references tecnicos (id) on delete set null,
  programada_el    date not null,
  realizada_el     date,
  estado           text not null default 'programada'
                   check (estado in ('programada', 'hecha', 'reprogramada', 'anulada')),
  frecuencia_meses integer,
  titulo           text,
  nota             text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index if not exists mantenciones_por_fecha
  on mantenciones (programada_el) where estado = 'programada';
create index if not exists mantenciones_por_cliente on mantenciones (cliente_id);

-- ─── Permisos ───────────────────────────────────────────────────────────────
do $$
begin
  execute 'alter table mantenciones enable row level security';
  execute 'drop policy if exists "equipo" on mantenciones';
  execute 'create policy "equipo" on mantenciones for all to authenticated
           using (true) with check (true)';
end $$;
