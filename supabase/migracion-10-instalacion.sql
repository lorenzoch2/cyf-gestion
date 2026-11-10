-- ════════════════════════════════════════════════════════════════════════════
--  Migración 10 — Instalación en el tarifario
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  El tarifario tenía mantenciones y adicionales, y ninguna línea de
--  instalación: el primer presupuesto de instalación hubo que armarlo a mano.
--  Esta migración abre la categoría y carga los precios.
--
--  Espeja `_Fuentes/04 Comercial/Tarifario/…2026.md`, sección 7,
--  igual que `datos/seed-servicios.sql`: si cambia un precio, cambia en los tres.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── La categoría nueva ─────────────────────────────────────────────────────
--  El check se reemplaza entero porque Postgres no deja ampliar uno existente.
alter table servicios drop constraint if exists servicios_categoria_check;
alter table servicios add  constraint servicios_categoria_check
  check (categoria in ('climatizacion', 'refrigeracion', 'instalacion', 'adicional'));

-- ─── Los precios ────────────────────────────────────────────────────────────
--  El valor por equipo cubre el montaje completo con los 3 m de cañería del
--  kit y drenaje por gravedad. Lo que depende de la medición —metros de más,
--  bomba, eléctrico, hormigón— va en líneas propias: así un imprevisto se
--  cobra en vez de comerse el margen del día.
--
--  Piso: tres personas un día son $200.000 de costo directo con traslado y
--  consumibles. Dos equipos a $150.000 dejan $100.000 sobre ese costo.
--  Los precios se cargan desde `supabase/datos/10-servicios-instalacion.sql`,
--  que no está versionado.
