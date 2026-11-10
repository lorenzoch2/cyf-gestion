-- ════════════════════════════════════════════════════════════════════════════
--  Migración 03 — Equipo e inventario
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Después de este archivo va seed-dotacion.sql, que trae el catálogo de los
--  153 ítems y lo que ya había en el inventario de junio de 2026.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Las personas de la empresa ─────────────────────────────────────────────
--  Un técnico NO es una cuenta de acceso. Francisco tiene dotación aunque no
--  entre nunca a la app, y la app se usa desde un solo teléfono. Si algún día
--  una persona tiene cuenta, se enlaza por `usuario_id`; mientras tanto va
--  nulo y no estorba.
create table if not exists tecnicos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  rol         text,
  telefono    text,
  email       text,
  usuario_id  uuid,
  activo      boolean not null default true,
  orden       integer not null default 0,
  nota        text,
  creado_en   timestamptz not null default now()
);

-- ─── Qué debe tener la empresa ──────────────────────────────────────────────
--  El catálogo es la norma, no el estado: dice qué corresponde tener y de
--  quién es cada cosa. Se genera desde herramientas/catalogo.py.
--    ambito  T = cada técnico tiene el suyo
--            E = uno para la empresa (taller)
--            V = va en la camioneta
create table if not exists catalogo_insumos (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,
  nombre            text not null,
  categoria         text not null,
  ambito            text not null default 'E' check (ambito in ('T', 'E', 'V')),
  unidad            text not null default 'unidad',
  cantidad_objetivo numeric not null default 1,
  critico           boolean not null default false,
  consumible        boolean not null default false,
  nota              text,
  orden             integer not null default 0,
  activo            boolean not null default true,
  creado_en         timestamptz not null default now()
);

-- ─── Qué hay de verdad ──────────────────────────────────────────────────────
--  Una fila por ítem y por dueño. `tecnico_id` nulo significa «de la empresa,
--  sin asignar a nadie»: así entra tal cual el inventario de junio, que nunca
--  dijo de quién era cada herramienta.
--
--  Estados:
--    tiene    está y sirve
--    falta    no está, o nunca se registró
--    agotado  se usó, se gastó o se acabó — hay que reponerlo
--    baja     se rompió o se perdió
create table if not exists existencias (
  id             uuid primary key default gen_random_uuid(),
  insumo_id      uuid not null references catalogo_insumos(id) on delete cascade,
  tecnico_id     uuid references tecnicos(id) on delete set null,
  estado         text not null default 'falta'
                 check (estado in ('tiene', 'falta', 'agotado', 'baja')),
  cantidad       numeric not null default 0,
  marca          text,
  modelo         text,
  serie          text,
  valor          numeric,
  ubicacion      text,
  nota           text,
  actualizado_en timestamptz not null default now()
);

--  Un ítem no puede estar dos veces para el mismo dueño. El índice va con
--  coalesce porque en SQL dos nulos no son iguales, y «sin asignar» tiene que
--  comportarse como un dueño más.
create unique index if not exists existencias_por_dueno
  on existencias (insumo_id, coalesce(tecnico_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists existencias_por_estado on existencias (estado);

-- ─── Lo que falta, cotizado ─────────────────────────────────────────────────
--  Los precios se guardan netos, como los entrega el proveedor; el IVA lo pone
--  la pantalla. `elegida` marca cuál se decidió comprar entre varias.
create table if not exists cotizaciones_insumo (
  id          uuid primary key default gen_random_uuid(),
  insumo_id   uuid not null references catalogo_insumos(id) on delete cascade,
  proveedor   text not null,
  telefono    text,
  url         text,
  precio_neto numeric,
  cantidad    numeric not null default 1,
  fecha       date not null default current_date,
  estado      text not null default 'pedida'
              check (estado in ('pedida', 'recibida', 'comprada', 'descartada')),
  nota        text,
  creado_en   timestamptz not null default now()
);

create index if not exists cotizaciones_por_insumo on cotizaciones_insumo (insumo_id);

-- ─── El equipo, para partir ─────────────────────────────────────────────────
--  Los cargos son los de las tarjetas de presentación acordadas con Francisco.
--  Las personas del equipo se cargan desde `supabase/datos/03-tecnicos.sql`,
--  que no está versionado. Ver `supabase/datos-ejemplo/` para la forma.

-- ─── Permisos ───────────────────────────────────────────────────────────────
--  La misma regla que el resto: quien tiene sesión, trabaja; quien no, no ve.
do $$
declare t text;
begin
  foreach t in array array['tecnicos', 'catalogo_insumos', 'existencias',
                           'cotizaciones_insumo'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipo" on %I', t);
    execute format('create policy "equipo" on %I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;
