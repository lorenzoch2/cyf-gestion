-- ════════════════════════════════════════════════════════════════════════════
--  Migración 08 — Diagnóstico por equipo
--
--  Se pega completo en el editor SQL de Supabase y se ejecuta una vez. Se
--  puede volver a ejecutar sin romper nada.
--
--  Va después de migracion-06-informes.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── El razonamiento, no sólo el resultado ──────────────────────────────────
--  Un diagnóstico es una cadena: el cliente reporta un síntoma, el técnico
--  mide, descarta causas y llega a una. Hasta ahora todo eso caía en un
--  párrafo libre, y un párrafo libre no se puede comparar con el de la visita
--  anterior ni explicarle a un cliente por qué hay que cambiar un compresor.
--
--  Va en `informe_equipos` y no en `informes` porque se diagnostica una
--  máquina, no una visita: en un local con cuatro equipos, tres pueden estar
--  sanos y uno no.
alter table informe_equipos add column if not exists sintoma text;
alter table informe_equipos add column if not exists descartado text;
alter table informe_equipos add column if not exists causa text;
alter table informe_equipos add column if not exists severidad text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'informe_equipos_severidad_valida'
  ) then
    alter table informe_equipos add constraint informe_equipos_severidad_valida
      check (severidad is null or severidad in ('observacion', 'atencion', 'urgente'));
  end if;
end $$;

-- ─── Para leer la historia de una máquina ───────────────────────────────────
--  La ficha del equipo recorre todos los informes donde aparece, en orden.
create index if not exists informe_equipos_por_equipo
  on informe_equipos (equipo_id) where equipo_id is not null;

create index if not exists informes_por_fecha on informes (fecha desc);
