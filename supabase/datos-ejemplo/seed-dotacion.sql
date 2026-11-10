--  Ejemplo. El catálogo real lo genera `herramientas/catalogo.py`, que sí está
--  versionado; su salida, no.

insert into catalogo_insumos (codigo, categoria, nombre, ambito, critico, orden) values
  ('EJ-001', 'Herramienta manual', 'Herramienta de ejemplo',  'T', false, 1),
  ('EJ-002', 'Instrumento',        'Instrumento de ejemplo',  'E', true,  2),
  ('EJ-003', 'Consumible',         'Consumible de ejemplo',   'V', false, 3)
on conflict (codigo) do nothing;
