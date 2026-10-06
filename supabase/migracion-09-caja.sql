-- ════════════════════════════════════════════════════════════════════════════
--  Migración 09 — Caja
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Alcance decidido: la app registra la caja y entrega las cifras del mes ya
--  ordenadas. El libro de contabilidad y el F29 siguen siendo el registro
--  formal; esto los alimenta, no los reemplaza.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Lo que entra y lo que sale ─────────────────────────────────────────────
--  Los montos se guardan los tres: neto, IVA y total. Podría calcularse uno
--  desde otro, pero una boleta real trae el total redondeado y el neto que
--  sale de dividir por 1,19 no siempre cuadra al peso. Guardar los tres deja
--  que el documento mande, que es lo que el SII va a mirar.
--
--  `retencion` existe para las boletas de honorarios y se anota a mano: la
--  tasa de retención sube todos los años por ley, y una tasa cableada en el
--  código es una cifra equivocada esperando al próximo enero.
create table if not exists movimientos (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('ingreso', 'egreso')),
  fecha          date not null default current_date,
  descripcion    text not null,
  categoria      text,
  cliente_id     uuid references clientes (id) on delete set null,
  proveedor_id   uuid references proveedores (id) on delete set null,
  presupuesto_id uuid references presupuestos (id) on delete set null,
  informe_id     uuid references informes (id) on delete set null,
  documento      text not null default 'sin_documento'
                 check (documento in ('factura', 'boleta', 'honorarios', 'sin_documento')),
  numero         text,
  neto           integer not null default 0,
  iva            integer not null default 0,
  retencion      integer not null default 0,
  total          integer not null default 0,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  vence_el       date,
  pagado_el      date,
  nota           text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists movimientos_por_fecha on movimientos (fecha desc);
create index if not exists movimientos_pendientes on movimientos (estado, vence_el)
  where estado = 'pendiente';

-- ─── Permisos ───────────────────────────────────────────────────────────────
do $$
begin
  execute 'alter table movimientos enable row level security';
  execute 'drop policy if exists "equipo" on movimientos';
  execute 'create policy "equipo" on movimientos for all to authenticated
           using (true) with check (true)';
end $$;
