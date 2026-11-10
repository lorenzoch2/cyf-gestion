--  Ejemplo. Los locales reales no están en el control de versiones.
--  Las coordenadas y los datos de contacto son inventados.

insert into prospectos (zona, rubro, nombre, direccion, equipos, prioridad,
                        telefono, horario, lat, lng) values
  ('centro', 'Restaurante', 'Local de ejemplo 1', 'Calle Falsa 100',
   'Cámara y climatización', 'alta',  '+56900000001', 'Mo-Fr 09:00-20:00', -33.45, -70.65),
  ('centro', 'Café',        'Local de ejemplo 2', 'Calle Falsa 200',
   'Vitrina',               'media', '+56900000002', null,                -33.46, -70.64),
  ('centro', 'Minimarket',  'Local de ejemplo 3', 'Calle Falsa 300',
   'Cámara y congeladora',  'baja',  null,          null,                -33.44, -70.66)
on conflict do nothing;
