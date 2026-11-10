-- ════════════════════════════════════════════════════════════════════════════
--  Migración 04 — Proveedores y órdenes de compra
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Va después de migracion-03-inventario.sql: las órdenes apuntan al catálogo
--  de insumos, y recibir una orden es lo que deja un ítem en «lo tenemos».
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Proveedores ────────────────────────────────────────────────────────────
--  `validez_dias` no es un adorno: hay listas de precios que duran una
--  semana y sus cotizaciones puntuales tres días corridos. Un presupuesto al
--  cliente con 30 días de validez apoyado en un precio que vence en tres es
--  una pérdida esperando ocurrir, así que la app tiene que saber cuándo vence
--  cada precio y decirlo sola.
create table if not exists proveedores (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  razon_social text,
  rut          text,
  rubro        text,
  contacto     text,
  telefono     text,
  email        text,
  direccion    text,
  comuna       text,
  web          text,
  condiciones  text,
  validez_dias integer,
  nota         text,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);

-- ─── La cotización ahora sabe de quién es y cuándo vence ────────────────────
--  La columna `proveedor` de texto se queda: sirve para lo que se anotó rápido
--  en la calle sin crear ficha. Si hay `proveedor_id`, ese manda.
alter table cotizaciones_insumo
  add column if not exists proveedor_id uuid references proveedores (id) on delete set null;
alter table cotizaciones_insumo
  add column if not exists vence_el date;

-- ─── Órdenes de compra ──────────────────────────────────────────────────────
--  Son las que la empresa emite a un proveedor. No confundir con las órdenes
--  de compra que un cliente le emite a la empresa, que son venta y viven en el
--  lado comercial.
create table if not exists ordenes_compra (
  id                uuid primary key default gen_random_uuid(),
  numero            text unique,
  proveedor_id      uuid references proveedores (id) on delete set null,
  fecha             date not null default current_date,
  entrega_esperada  date,
  estado            text not null default 'borrador'
                    check (estado in ('borrador', 'enviada', 'recibida', 'anulada')),
  nota              text,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create table if not exists orden_lineas (
  id          uuid primary key default gen_random_uuid(),
  orden_id    uuid not null references ordenes_compra (id) on delete cascade,
  insumo_id   uuid references catalogo_insumos (id) on delete set null,
  descripcion text not null,
  cantidad    numeric(10, 2) not null default 1,
  precio_neto integer not null default 0,
  orden       integer not null default 0
);

create index if not exists ordenes_por_proveedor on ordenes_compra (proveedor_id);
create index if not exists lineas_por_orden on orden_lineas (orden_id);

-- ─── El proveedor que ya existe en la carpeta de la empresa ─────────────────
--  Los proveedores se cargan desde `supabase/datos/04-proveedores.sql`, que no
--  está versionado: llevan RUT, contacto y condiciones comerciales de un tercero.

-- ─── Permisos ───────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['proveedores', 'ordenes_compra', 'orden_lineas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipo" on %I', t);
    execute format('create policy "equipo" on %I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;
