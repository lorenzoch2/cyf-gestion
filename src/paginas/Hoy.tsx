import { Link } from 'react-router-dom'
import { Cargando, Cifra, Etiqueta, Panel, Pantalla, Rotulo, Tarjeta, Vacio } from '../componentes/ui'
import {
  consultarClientes, consultarMantenciones, consultarResumen, consultarTareas, guardarTarea,
  useConsulta,
} from '../lib/datos'
import { clp, diasHasta, fechaCorta, hoyIso, plural, vencimiento } from '../lib/formato'
import { ETAPAS } from '../lib/tipos'
import { db } from '../lib/supabase'
import type { Cliente, Mantencion, Oportunidad, Prospecto, Tarea } from '../lib/tipos'

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

  /*
    Una mantención comprometida y olvidada es lo más caro que puede pasar acá:
    es el contrato recurrente que se cae, y el cliente no reclama — se va. Por
    eso encabeza la pantalla, antes que los pendientes propios.
  */
  const mantenciones = useConsulta<Mantencion[]>(() => consultarMantenciones(true), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])

  const r = resumen.datos
  const pendientes = (tareas.datos ?? []).filter(t => !t.hecha)

  const tocaHoy = (mantenciones.datos ?? []).filter(
    m => (diasHasta(m.programada_el) ?? 1) <= 0,
  )
  const nombreCliente = (id: string) =>
    clientes.datos?.find(c => c.id === id)?.nombre ?? 'Cliente'

  // Lo atrasado y lo de hoy no son lo mismo a las ocho de la mañana.
  const seguir = seguimientos.datos ?? []
  const atrasados = seguir.filter(p => (diasHasta(p.proximo_paso_en) ?? 0) < 0)
  const paraHoy = seguir.filter(p => (diasHasta(p.proximo_paso_en) ?? 0) >= 0)

  /*
    El día limpio.

    Sin nada pendiente la pantalla mostraba dos cajas punteadas enormes, una
    debajo de otra, diciendo las dos que no había nada. Eso ocupa media
    pantalla para dar cero información. Cuando no hay nada que arrastrar, lo
    único que corresponde decir es qué hacer ahora.
  */
  const diaLimpio =
    !tareas.cargando &&
    !seguimientos.cargando &&
    pendientes.length === 0 &&
    seguir.length === 0 &&
    tocaHoy.length === 0

  async function marcar(tarea: Tarea) {
    await guardarTarea(tarea.id, { hecha: true, hecha_en: new Date().toISOString() })
    void tareas.recargar()
    void resumen.recargar()
  }

  return (
    <Pantalla titulo="Hoy" bajada={new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {resumen.cargando && <Cargando />}

      {/*
        Las dos cifras van sobre el panel oscuro y no en dos tarjetas blancas.
        Son la lectura del día —cuánta calle queda y cuánta plata está en
        juego— y en una app que por lo demás es toda clara, la zona oscura es
        donde el ojo cae primero. Eso es exactamente lo que se quiere de un
        tablero.
      */}
      {r && (
        <Panel className="px-4 py-4">
          <div className="grid grid-cols-2 divide-x divide-panel-linea">
            <Link to="/prospectos" className="pr-4">
              <Cifra tono="laton">{r.porVisitar}</Cifra>
              <span className="mt-1.5 block text-[0.78rem] leading-tight text-faint">
                {r.porVisitar === 1 ? 'local por visitar' : 'locales por visitar'}
              </span>
              {r.visitadosHoy > 0 && (
                <span className="mt-1.5 block font-mono text-[0.72rem] text-verde">
                  +{r.visitadosHoy} visitados hoy
                </span>
              )}
            </Link>
            <Link to="/negocios" className="pl-4">
              <Cifra tono="papel">{clp(r.montoEnJuego)}</Cifra>
              <span className="mt-1.5 block text-[0.78rem] leading-tight text-faint">
                en {plural(r.oportunidadesAbiertas, 'negocio abierto', 'negocios abiertos')}
              </span>
            </Link>
          </div>
        </Panel>
      )}

      {tocaHoy.length > 0 && (
        <section className="mt-6">
          <Rotulo className="mb-2 flex items-baseline justify-between">
            Mantenciones comprometidas
            <Link to="/mantenciones" className="font-sans text-xs normal-case tracking-normal text-acero-dk">
              ver todas
            </Link>
          </Rotulo>
          <ul className="space-y-2">
            {tocaHoy.slice(0, 5).map(m => {
              const dias = diasHasta(m.programada_el) ?? 0
              return (
                <li key={m.id}>
                  <Link to="/mantenciones">
                    <Tarjeta
                      className={`flex items-center justify-between gap-3 border-l-4 p-3 ${
                        dias < 0 ? 'border-l-rojo' : 'border-l-laton'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {nombreCliente(m.cliente_id)}
                        </p>
                        <p className="truncate text-xs text-mut">
                          {m.titulo ?? 'Mantención preventiva'}
                        </p>
                      </div>
                      <Etiqueta tono={dias < 0 ? 'rojo' : 'laton'}>
                        {dias < 0 ? `atrasada ${-dias} d` : 'hoy'}
                      </Etiqueta>
                    </Tarjeta>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {diaLimpio && (
        <section className="mt-6">
          <Rotulo className="mb-2">Nada arrastrando</Rotulo>
          <Link to="/prospectos">
            <Tarjeta className="border-l-4 border-l-laton">
              <p className="text-sm">
                Sin pendientes, sin seguimientos y sin mantenciones comprometidas. El día está
                limpio para hacer calle.
              </p>
              <p className="mt-2 text-sm font-medium text-acero-dk">
                Ver los locales por visitar →
              </p>
            </Tarjeta>
          </Link>
        </section>
      )}

      <section className={diaLimpio ? 'hidden' : 'mt-6'}>
        <Rotulo className="mb-2 flex items-baseline justify-between">
          Pendientes
          <Link to="/tareas" className="font-sans text-xs normal-case tracking-normal text-acero-dk">
            ver todos
          </Link>
        </Rotulo>
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

      {[
        { titulo: 'Se te pasaron', lista: atrasados, tono: 'rojo' as const },
        { titulo: 'Volver a pasar hoy', lista: paraHoy, tono: 'laton' as const },
      ]
        .filter(grupo => grupo.lista.length > 0)
        .map(grupo => (
          <section key={grupo.titulo} className="mt-6">
            <Rotulo className="mb-2">
              {grupo.titulo}
              <span className="ml-2 text-faint">{grupo.lista.length}</span>
            </Rotulo>
            <ul className="space-y-2">
              {grupo.lista.map(p => (
                <li key={p.id}>
                  <Link to={`/prospectos/${p.id}`}>
                    <Tarjeta className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.nombre}</p>
                        <p className="truncate text-xs text-mut">{p.proximo_paso ?? 'Sin nota'}</p>
                      </div>
                      <Etiqueta tono={grupo.tono}>{fechaCorta(p.proximo_paso_en)}</Etiqueta>
                    </Tarjeta>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {seguir.length === 0 && !diaLimpio && (
        <section className="mt-6">
          <Rotulo className="mb-2">Volver a pasar</Rotulo>
          <Vacio texto="Nadie te está esperando hoy. Los seguimientos se agendan al registrar una visita." />
        </section>
      )}

      {(negocios.datos ?? []).length > 0 && (
        <section className="mt-6">
          <Rotulo className="mb-2">Esperando respuesta</Rotulo>
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
