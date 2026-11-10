--  Ejemplo. Las personas del equipo no están en el control de versiones.

insert into tecnicos (nombre, rol, orden)
select 'Nombre Apellido', 'Supervisor técnico', 10
where not exists (select 1 from tecnicos where nombre = 'Nombre Apellido');
