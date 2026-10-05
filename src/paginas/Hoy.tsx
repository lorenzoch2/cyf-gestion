import { Link } from 'react-router-dom'
import { Cargando, Etiqueta, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { consultarResumen, consultarTareas, guardarTarea, useConsulta } from '../lib/datos'
import { clp, fechaCorta, hoyIso, plural, vencimiento } from '../lib/formato'
import { ETAPAS } from '../lib/tipos'
import { db } from '../lib/supabase'
import type { Oportunidad, Prospecto, Tarea } from '../lib/tipos'

export function Hoy() {
  const resumen = useConsulta(() => consultarResumen().then(data => ({ data, error: null })), [])
  const tareas = useConsulta<Tarea[]>(() => consultarTareas(true), [])
  const seguimientos = useConsulta<Prospecto[]>(
    () =>
      db()
        .from('prospectos')
        .select('*')
        .not('proximo_paso_en', 'is', null)
        .lte('proximo_paso_en', hoyIso())
        .neq('estado', 'descartado')
        .order('proximo_paso_en')
        .limit(20),
    [],
  )
  const negocios = useConsulta<Oportunidad[]>(
    () =>
      db()
        .from('oportunidades')
        .select('*')
        .in('etapa', ['cotizada', 'negociacion'])
        .order('actualizado_en', { ascending: false })
        .limit(5),
    [],
  )

  const r = resumen.datos
  const pendientes = (tareas.datos ?? []).filter(t => !t.hecha)

  async function marcar(tarea: Tarea) {
    await guardarTarea(tarea.id, { hecha: true, hecha_en: new Date().toISOString() })
    void tareas.recargar()
    void resumen.recargar()
  }

  return (
    <Pantalla titulo="Hoy" bajada={new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {resumen.cargando && <Cargando />}

      {r && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/prospectos">
            <Tarjeta className="h-full">
              <p className="font-mono text-2xl font-medium">{r.porVisitar}</p>
              <p className="mt-1 text-sm text-mut">
                {r.porVisitar === 1 ? 'local por visitar' : 'locales por visitar'}
              </p>
              {r.visitadosHoy > 0 && (
                <p className="mt-2 text-xs text-verde">{r.visitadosHoy} visitados hoy</p>
              )}
            </Tarjeta>
          </Link>
          <Link to="/negocios">
            <Tarjeta className="h-full">
              <p className="font-mono text-2xl font-medium">{clp(r.montoEnJuego)}</p>
              <p className="mt-1 text-sm text-mut">
                en {plural(r.oportunidadesAbiertas, 'negocio abierto', 'negocios abiertos')}
              </p>
            </Tarjeta>
          </Link>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
          Pendientes
          <Link to="/tareas" className="text-xs font-normal text-acero-dk">
            ver todos
          </Link>
        </h2>
        {tareas.cargando ? (
          <Cargando />
        ) : pendientes.length === 0 ? (
          <Vacio texto="Nada pendiente. Buen momento para salir a la calle." />
        ) : (
          <ul className="space-y-2">
            {pendientes.slice(0, 6).map(t => {
              const v = vencimiento(t.vence_en)
              return (
                <li key={t.id}>
                  <Tarjeta className="flex items-start gap-3 p-3">
                    <button
                      onClick={() => marcar(t)}
                      aria-label="Marcar como hecha"
                      className="mt-0.5 size-5 shrink-0 rounded border border-linea-2 active:bg-tinte"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{t.titulo}</p>
                      <p className="mt-0.5 text-xs">
                        <span className={v.tono === 'rojo' ? 'text-rojo' : v.tono === 'laton' ? 'text-laton-dk' : 'text-faint'}>
                          {v.texto}
                        </span>
                      </p>
                    </div>
                  </Tarjeta>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Volver a pasar</h2>
        {(seguimientos.datos ?? []).length === 0 ? (
          <Vacio texto="Sin seguimientos con fecha para hoy." />
        ) : (
          <ul className="space-y-2">
            {(seguimientos.datos ?? []).map(p => (
              <li key={p.id}>
                <Link to={`/prospectos/${p.id}`}>
                  <Tarjeta className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <p className="truncate text-xs text-mut">{p.proximo_paso ?? 'Sin nota'}</p>
                    </div>
                    <Etiqueta tono={vencimiento(p.proximo_paso_en).tono === 'rojo' ? 'rojo' : 'laton'}>
                      {fechaCorta(p.proximo_paso_en)}
                    </Etiqueta>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(negocios.datos ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">Esperando respuesta</h2>
          <ul className="space-y-2">
            {(negocios.datos ?? []).map(o => (
              <li key={o.id}>
                <Link to="/negocios">
                  <Tarjeta className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.titulo}</p>
                      <p className="text-xs text-mut">{ETAPAS[o.etapa]}</p>
                    </div>
                    <span className="font-mono text-sm">{clp(o.monto_neto)}</span>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Pantalla>
  )
}
