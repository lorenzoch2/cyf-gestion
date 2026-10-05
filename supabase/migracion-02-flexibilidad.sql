-- ════════════════════════════════════════════════════════════════════════════
--  Migración 02 — estados de gestión, rutas y tarifarios por cliente o zona
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se puede
--  volver a ejecutar sin romper nada.
--
--  Qué cambia:
--    1. Los estados de gestión pasan de 5 a 7, con uno para «interesado» y otro
--       para «cotizado». Los que ya existían siguen valiendo.
--    2. Aparecen las rutas: un local puede pertenecer a una ruta de visita.
--    3. Los prospectos pueden crearse a mano, no sólo venir del mapa.
--    4. El tarifario deja de ser uno solo: hay uno base y se pueden crear otros
--       por zona o por cliente, cada uno con sus propios precios.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Estados de gestión ──────────────────────────────────────────────────
alter table prospectos drop constraint if exists prospectos_estado_check;
alter table prospectos add constraint prospectos_estado_check
  check (estado in ('por_visitar', 'visitado', 'interesado', 'evaluacion',
                    'cotizado', 'cliente', 'descartado'));

-- ─── 2. Rutas de visita ─────────────────────────────────────────────────────
create table if not exists rutas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  zona      text,
  fecha     date,
  notas     text,
  estado    text not null default 'planificada'
            check (estado in ('planificada', 'en_curso', 'terminada')),
  creado_en timestamptz not null default now()
);

alter table prospectos add column if not exists ruta_id uuid references rutas (id) on delete set null;
create index if not exists prospectos_ruta_idx on prospectos (ruta_id);

-- ─── 3. Locales agregados a mano ────────────────────────────────────────────
alter table prospectos add column if not exists origen text not null default 'osm'
  check (origen in ('osm', 'manual'));

-- El índice único de la carga inicial impide agregar un local sin coordenadas
-- más de una vez. Se reemplaza por uno que sólo mira filas con coordenadas.
alter table prospectos drop constraint if exists prospectos_nombre_lat_lng_key;
drop index if exists prospectos_nombre_lat_lng_key;
create unique index if not exists prospectos_unico_osm
  on prospectos (nombre, lat, lng) where lat is not null and lng is not null;

-- ─── 4. Tarifarios ──────────────────────────────────────────────────────────
--  `servicios` queda como el catálogo: qué se vende y en qué unidad.
--  `tarifarios` son listas de precios; `tarifario_precios`, el precio de cada
--  servicio en cada lista. Un precio se busca en este orden: tarifario del
--  cliente → tarifario de su zona → tarifario base.
create table if not exists tarifarios (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  tipo       text not null default 'base' check (tipo in ('base', 'zona', 'cliente')),
  zona       text,
  cliente_id uuid references clientes (id) on delete cascade,
  notas      text,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  constraint tarifario_zona_coherente check (tipo <> 'zona' or zona is not null),
  constraint tarifario_cliente_coherente check (tipo <> 'cliente' or cliente_id is not null)
);

create table if not exists tarifario_precios (
  id           uuid primary key default gen_random_uuid(),
  tarifario_id uuid not null references tarifarios (id) on delete cascade,
  servicio_id  uuid not null references servicios (id) on delete cascade,
  precio_neto  integer not null,
  unique (tarifario_id, servicio_id)
);

create index if not exists tarifarios_tipo_idx on tarifarios (tipo, activo);
create index if not exists precios_tarifario_idx on tarifario_precios (tarifario_id);

-- Un solo tarifario base, con los precios que ya estaban en `servicios`.
insert into tarifarios (nombre, tipo, notas)
select 'Tarifario general 2026', 'base', 'El que se aplica cuando el cliente no tiene uno propio.'
where not exists (select 1 from tarifarios where tipo = 'base');

insert into tarifario_precios (tarifario_id, servicio_id, precio_neto)
select t.id, s.id, s.precio_neto
from tarifarios t
cross join servicios s
where t.tipo = 'base'
on conflict (tarifario_id, servicio_id) do nothing;

-- ─── 5. Permisos de las tablas nuevas ───────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['rutas', 'tarifarios', 'tarifario_precios'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipo" on %I', t);
    execute format('create policy "equipo" on %I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;
