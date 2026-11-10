--  Ejemplo. Los precios reales no están en el control de versiones.

insert into servicios (categoria, nombre, unidad, precio_neto, orden) values
  ('instalacion', 'Instalación de ejemplo', 'equipo', 10000, 31)
on conflict (nombre) do nothing;
