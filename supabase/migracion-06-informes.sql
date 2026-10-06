-- ════════════════════════════════════════════════════════════════════════════
--  Migración 06 — Informes de cierre
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Va después de migracion-05-mantenciones.sql: un informe puede cerrar una
--  mantención programada.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── El informe ─────────────────────────────────────────────────────────────
--  Uno por visita, no por equipo. En un minimarket con cuatro splits y un
--  visicooler sale un documento con cinco bloques adentro; emitir cinco
--  informes por una visita es la forma más rápida de que nadie los lea.
--
--  La firma se guarda como imagen en texto (data URL). Son unos 10 KB y así no
--  depende de que el almacenamiento esté disponible para poder cerrar en
--  terreno, que es donde la señal falla.
create table if not exists informes (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,
  cliente_id     uuid references clientes (id) on delete set null,
  mantencion_id  uuid references mantenciones (id) on delete set null,
  tecnico_id     uuid references tecnicos (id) on delete set null,
  tipo           text not null default 'preventiva'
                 check (tipo in ('preventiva', 'correctivo', 'instalacion', 'diagnostico')),
  fecha          date not null default current_date,
  hora_entrada   time,
  hora_salida    time,
  resumen        text,
  recomendacion  text,
  proxima_visita date,
  recibe_nombre  text,
  recibe_cargo   text,
  conforme       boolean,
  firma          text,
  estado         text not null default 'borrador'
                 check (estado in ('borrador', 'emitido')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ─── Un bloque por equipo ───────────────────────────────────────────────────
--  `trabajo` y `mediciones` van en jsonb porque la lista cambia según el tipo
--  de máquina: un split no tiene deshielo y una cámara no tiene caudal. Una
--  columna por medición sería una tabla de cuarenta columnas casi siempre
--  vacías.
--
--  El refrigerante vive aquí y no aparte: se mueve por equipo, y es el dato
--  que la NCh 3241 espera que se pueda demostrar.
create table if not exists informe_equipos (
  id             uuid primary key default gen_random_uuid(),
  informe_id     uuid not null references informes (id) on delete cascade,
  equipo_id      uuid references equipos (id) on delete set null,
  descripcion    text,
  trabajo        jsonb not null default '[]'::jsonb,
  mediciones     jsonb not null default '{}'::jsonb,
  gas_tipo       text,
  gas_recuperado numeric,
  gas_cargado    numeric,
  nota           text,
  orden          integer not null default 0
);

-- ─── Hallazgos ──────────────────────────────────────────────────────────────
--  Lo que se encontró y no era parte del trabajo. Es la razón comercial de que
--  el informe exista: de aquí sale el próximo presupuesto.
create table if not exists informe_hallazgos (
  id             uuid primary key default gen_random_uuid(),
  informe_id     uuid not null references informes (id) on delete cascade,
  equipo_id      uuid references equipos (id) on delete set null,
  nivel          text not null default 'observacion'
                 check (nivel in ('observacion', 'atencion', 'urgente')),
  detalle        text not null,
  presupuesto_id uuid references presupuestos (id) on delete set null,
  creado_en      timestamptz not null default now()
);

-- ─── Materiales usados ──────────────────────────────────────────────────────
create table if not exists informe_materiales (
  id          uuid primary key default gen_random_uuid(),
  informe_id  uuid not null references informes (id) on delete cascade,
  insumo_id   uuid references catalogo_insumos (id) on delete set null,
  descripcion text not null,
  cantidad    numeric not null default 1,
  unidad      text not null default 'unidad'
);

-- ─── Fotos ──────────────────────────────────────────────────────────────────
--  `ruta` es la ruta dentro del bucket, no una URL: el bucket es privado y la
--  app baja el archivo con la sesión de quien mira.
create table if not exists informe_fotos (
  id         uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes (id) on delete cascade,
  equipo_id  uuid references equipos (id) on delete set null,
  ruta       text not null,
  momento    text not null default 'otro' check (momento in ('antes', 'despues', 'otro')),
  nota       text,
  orden      integer not null default 0,
  creado_en  timestamptz not null default now()
);

create index if not exists informes_por_cliente on informes (cliente_id);
create index if not exists informe_equipos_por_informe on informe_equipos (informe_id);
create index if not exists informe_hallazgos_por_informe on informe_hallazgos (informe_id);
create index if not exists informe_fotos_por_informe on informe_fotos (informe_id);

-- ─── Dónde viven las fotos ──────────────────────────────────────────────────
--  Bucket privado: una foto del interior de un local es del cliente, no del
--  internet. Tope de 5 MB por archivo, aunque la app las comprime antes de
--  subirlas y rara vez pasan de 300 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('informes', 'informes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "equipo ve fotos" on storage.objects;
create policy "equipo ve fotos" on storage.objects for select to authenticated
  using (bucket_id = 'informes');

drop policy if exists "equipo sube fotos" on storage.objects;
create policy "equipo sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'informes');

drop policy if exists "equipo borra fotos" on storage.objects;
create policy "equipo borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'informes');

-- ─── Permisos ───────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['informes', 'informe_equipos', 'informe_hallazgos',
                           'informe_materiales', 'informe_fotos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipo" on %I', t);
    execute format('create policy "equipo" on %I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;
