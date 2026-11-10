--  Ejemplo. Los proveedores reales no están en el control de versiones:
--  llevan RUT, contacto y condiciones comerciales de un tercero.

insert into proveedores (nombre, razon_social, rut, rubro, telefono, email, direccion,
                         comuna, condiciones, validez_dias, nota)
select 'Proveedor de ejemplo', 'Razón Social SpA', '11.111.111-1', 'Rubro',
       '2 0000 0000', 'contacto@ejemplo.cl', 'Dirección 100', 'Comuna',
       'Contado o transferencia. Precios netos, sin IVA.', 7, null
where not exists (select 1 from proveedores where nombre = 'Proveedor de ejemplo');
