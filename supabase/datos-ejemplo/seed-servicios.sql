--  Ejemplo. El tarifario real no está en el control de versiones.
--  Los precios son inventados.

insert into servicios (categoria, nombre, unidad, precio_neto, orden) values
  ('mantencion',  'Mantención de equipo de ejemplo', 'equipo',  10000, 1),
  ('reparacion',  'Diagnóstico de ejemplo',          'visita',  10000, 2),
  ('instalacion', 'Instalación de ejemplo',          'equipo',  10000, 3)
on conflict (nombre) do nothing;
