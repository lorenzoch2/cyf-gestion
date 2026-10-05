-- ════════════════════════════════════════════════════════════════════════════
--  Calor y Frío Industrial — base de gestión
--
--  Se pega completo en el editor SQL de Supabase (botón «New query») y se
--  ejecuta una vez. Se puede volver a ejecutar sin romper nada: todo está
--  escrito con «if not exists» o «drop ... if exists» antes de crear.
--
--  Orden de ejecución:
--    1. este archivo            → tablas y permisos
--    2. seed-servicios.sql      → el tarifario
--    3. seed-prospectos.sql     → los 333 locales de la campaña
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Clientes ───────────────────────────────────────────────────────────────
create table if not exists clientes (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  rut             text,
  direccion       text,
  comuna          text,
  contacto_nombre text,
  contacto_cargo  text,
  telefono        text,
  email           text,
  lat             double precision,
  lng             double precision,
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ─── Prospectos: los locales por visitar ────────────────────────────────────
create table if not exists prospectos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  rubro             text,
  zona              text,
  direccion         text,
  comuna            text,
  equipos_esperados text,
  prioridad         text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  estado            text not null default 'por_visitar'
                    check (estado in ('por_visitar', 'visitado', 'evaluacion', 'cliente', 'descartado')),
  telefono          text,
  horario           text,
  lat               double precision,
  lng               double precision,
  contacto_nombre   text,
  contacto_cargo    text,
  resultado         text,
  proximo_paso      text,
  proximo_paso_en   date,
  visitado_en       date,
  equipos_declarados integer,
  notas             text,
  cliente_id        uuid references clientes (id) on delete set null,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  -- La carga inicial viene de OpenStreetMap: un local es el mismo si coinciden
  -- nombre y coordenadas. Así el seed se puede volver a correr sin duplicar.
  unique (nombre, lat, lng)
);

-- ─── Equipos de cada cliente ────────────────────────────────────────────────
create table if not exists equipos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes (id) on delete cascade,
  tipo              text not null,
  descripcion       text,
  marca             text,
  modelo            text,
  capacidad         text,   -- «12.000 BTU», «2 HP»
  refrigerante      text,
  ubicacion         text,
  ultima_mantencion date,
  notas             text,
  creado_en         timestamptz not null default now()
);

-- ─── Contratos de mantención ────────────────────────────────────────────────
create table if not exists contratos (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references clientes (id) on delete cascade,
  plan               text not null check (plan in ('trimestral', 'semestral', 'anual', 'por_evento')),
  visitas_al_anio    integer,
  valor_visita_neto  integer,
  valor_mensual_neto integer,
  inicio             date,
  fin                date,
  proxima_visita     date,
  estado             text not null default 'activo' check (estado in ('activo', 'pausado', 'terminado')),
  notas              text,
  creado_en          timestamptz not null default now()
);

-- ─── Bitácora de visitas ────────────────────────────────────────────────────
create table if not exists visitas (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null default current_date,
  tipo            text not null
                  check (tipo in ('prospeccion', 'evaluacion', 'mantencion', 'correctivo', 'instalacion')),
  cliente_id      uuid references clientes (id) on delete cascade,
  prospecto_id    uuid references prospectos (id) on delete cascade,
  resumen         text,
  proximo_paso    text,
  proximo_paso_en date,
  creado_en       timestamptz not null default now(),
  constraint visita_tiene_destino check (cliente_id is not null or prospecto_id is not null)
);

-- ─── Oportunidades: lo que se está negociando ───────────────────────────────
create table if not exists oportunidades (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  cliente_id          uuid references clientes (id) on delete set null,
  prospecto_id        uuid references prospectos (id) on delete set null,
  etapa               text not null default 'nueva'
                      check (etapa in ('nueva', 'evaluacion', 'cotizada', 'negociacion', 'ganada', 'perdida')),
  monto_neto          integer,
  cierre_estimado     date,
  presupuesto_numero  text,
  motivo_cierre       text,
  notas               text,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);

-- ─── Pendientes ─────────────────────────────────────────────────────────────
create table if not exists tareas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  detalle        text,
  vence_en       date,
  hecha          boolean not null default false,
  hecha_en       timestamptz,
  cliente_id     uuid references clientes (id) on delete cascade,
  prospecto_id   uuid references prospectos (id) on delete cascade,
  oportunidad_id uuid references oportunidades (id) on delete cascade,
  creado_en      timestamptz not null default now()
);

-- ─── Tarifario ──────────────────────────────────────────────────────────────
create table if not exists servicios (
  id          uuid primary key default gen_random_uuid(),
  categoria   text not null check (categoria in ('climatizacion', 'refrigeracion', 'adicional')),
  nombre      text not null unique,
  unidad      text not null default 'equipo',
  precio_neto integer not null,
  orden       integer not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ─── Presupuestos ───────────────────────────────────────────────────────────
create table if not exists presupuestos (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,
  titulo         text,
  cliente_id     uuid references clientes (id) on delete set null,
  prospecto_id   uuid references prospectos (id) on delete set null,
  oportunidad_id uuid references oportunidades (id) on delete set null,
  fecha          date not null default current_date,
  estado         text not null default 'borrador'
                 check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado')),
  descuento_pct  numeric(5, 2) not null default 0,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists presupuesto_lineas (
  id                   uuid primary key default gen_random_uuid(),
  presupuesto_id       uuid not null references presupuestos (id) on delete cascade,
  descripcion          text not null,
  cantidad             numeric(10, 2) not null default 1,
  precio_unitario_neto integer not null,
  orden                integer not null default 0
);

-- ─── Índices ────────────────────────────────────────────────────────────────
create index if not exists prospectos_zona_idx        on prospectos (zona, prioridad);
create index if not exists prospectos_estado_idx      on prospectos (estado);
create index if not exists prospectos_proximo_idx     on prospectos (proximo_paso_en) where proximo_paso_en is not null;
create index if not exists equipos_cliente_idx        on equipos (cliente_id);
create index if not exists contratos_cliente_idx      on contratos (cliente_id);
create index if not exists visitas_cliente_idx        on visitas (cliente_id, fecha desc);
create index if not exists visitas_prospecto_idx      on visitas (prospecto_id, fecha desc);
create index if not exists oportunidades_etapa_idx    on oportunidades (etapa);
create index if not exists tareas_pendientes_idx      on tareas (hecha, vence_en);
create index if not exists lineas_presupuesto_idx     on presupuesto_lineas (presupuesto_id, orden);

-- ─── «actualizado_en» se mantiene solo ──────────────────────────────────────
create or replace function marcar_actualizado() returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['clientes', 'prospectos', 'oportunidades', 'presupuestos'] loop
    execute format('drop trigger if exists %I_actualizado on %I', t, t);
    execute format('create trigger %I_actualizado before update on %I
                    for each row execute function marcar_actualizado()', t, t);
  end loop;
end $$;

-- ─── Permisos ───────────────────────────────────────────────────────────────
--  La empresa son dos personas y las dos ven lo mismo. La regla es simple:
--  quien tiene sesión iniciada, trabaja; quien no, no ve nada. Las cuentas se
--  crean a mano en Supabase (Authentication → Users), no hay registro abierto.
do $$
declare t text;
begin
  foreach t in array array['clientes', 'prospectos', 'equipos', 'contratos', 'visitas',
                           'oportunidades', 'tareas', 'servicios', 'presupuestos',
                           'presupuesto_lineas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipo" on %I', t);
    execute format('create policy "equipo" on %I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;
