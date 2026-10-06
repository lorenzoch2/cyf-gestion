import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cargando, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { consultarEquipo, historialEquipo, useConsulta } from '../lib/datos'
import { compararMediciones, familiaDe, leerMediciones } from '../lib/diagnostico'
import { fechaCorta, plural } from '../lib/formato'
import {
  MEDICIONES_CIRCUITO, MEDICIONES_POR_FAMILIA, NIVELES_HALLAZGO, TIPOS_EQUIPO, TIPOS_INFORME,
  type Equipo, type InformeEquipo, type TipoInforme,
} from '../lib/tipos'

/*
  La ficha de una máquina.

  El dato ya estaba guardado —cada informe deja las mediciones de ese equipo—
  pero no había dónde mirarlo junto. Esto es lo que convierte una medición
  suelta en un argumento: «el consumo de este compresor pasó de 7,2 A en abril
  a 9,4 A hoy» convence a un cliente de cambiar un equipo mucho mejor que una
  opinión, y además es honesto, porque está medido.

  Va de la visita más reciente hacia atrás, que es como se lee una historia
  clínica.
*/

interface FilaHistorial extends InformeEquipo {
  informe: {
    id: string
    numero: string | null
    fecha: string
    tipo: TipoInforme
    creado_en?: string
  } | null
}

export function EquipoDetalle() {
  const { id = '' } = useParams()

  const equipo = useConsulta<Equipo>(() => consultarEquipo(id), [id])
  const historial = useConsulta<FilaHistorial[]>(() => historialEquipo(id), [id])

  const familia = familiaDe(equipo.datos)
  const definiciones = [...MEDICIONES_POR_FAMILIA[familia], ...MEDICIONES_CIRCUITO]

  /** De la visita más nueva a la más vieja, con lo que cambió respecto de la anterior. */
  const visitas = useMemo(() => {
    const orden = (f: FilaHistorial) => f.informe!.fecha + ' ' + (f.informe!.creado_en ?? '')
    const filas = (historial.datos ?? [])
      .filter(f => f.informe)
      .sort((a, b) => (orden(a) < orden(b) ? 1 : -1))
    return filas.map((fila, i) => ({
      fila,
      cambios: filas[i + 1]
        ? compararMediciones(definiciones, filas[i + 1].mediciones, fila.mediciones).filter(
            c => c.relevante,
          )
        : [],
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial.datos, familia])

  const e = equipo.datos
  const ultima = visitas[0]?.fila
  const pistas = ultima ? leerMediciones(familia, ultima.mediciones) : []

  if (equipo.cargando) return <Cargando />
  if (!e) {
    return (
      <Pantalla titulo="Equipo" volver>
        No se encontró el equipo.
      </Pantalla>
    )
  }

  return (
    <Pantalla
      titulo={TIPOS_EQUIPO[e.tipo] ?? e.tipo}
      bajada={[e.marca, e.capacidad, e.ubicacion].filter(Boolean).join(' · ') || 'Sin más datos'}
      volver
    >
      <div className="space-y-5">
        <Tarjeta className="p-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {[
              ['Marca', e.marca],
              ['Modelo', e.modelo],
              ['Capacidad', e.capacidad],
              ['Refrigerante', e.refrigerante],
              ['Ubicación', e.ubicacion],
              ['Última mantención', e.ultima_mantencion ? fechaCorta(e.ultima_mantencion) : null],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k as string}>
                  <dt className="font-mono text-[0.7rem] uppercase tracking-wider text-faint">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {e.notas && <p className="mt-2 text-sm text-mut">{e.notas}</p>}
        </Tarjeta>

        {pistas.length > 0 && (
          <section>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
              Cómo está hoy
            </h2>
            <div className="space-y-2">
              {pistas.map(p => (
                <Tarjeta key={p.titulo} className="p-3">
                  <p className="text-sm font-medium">
                    <span
                      className={`mr-1.5 rounded px-1.5 py-0.5 text-[0.7rem] ${
                        NIVELES_HALLAZGO[p.nivel].pastilla
                      }`}
                    >
                      {NIVELES_HALLAZGO[p.nivel].corta}
                    </span>
                    {p.titulo}
                  </p>
                  <p className="mt-1 text-xs text-mut">{p.porque}</p>
                </Tarjeta>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
            Historia · {plural(visitas.length, 'visita', 'visitas')}
          </h2>

          {historial.cargando ? (
            <Cargando />
          ) : visitas.length === 0 ? (
            <Vacio texto="Esta máquina todavía no aparece en ningún informe." />
          ) : (
            <ol className="space-y-2">
              {visitas.map(({ fila, cambios }) => {
                const medidas = definiciones.filter(d => fila.mediciones?.[d.clave])
                return (
                  <li key={fila.id}>
                    <Tarjeta className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/informes/${fila.informe!.id}`}
                            className="font-medium text-acero-dk"
                          >
                            {TIPOS_INFORME[fila.informe!.tipo] ?? fila.informe!.tipo}
                          </Link>
                          <p className="font-mono text-xs text-faint">
                            IC {fila.informe!.numero ?? '—'}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-faint">
                          {fechaCorta(fila.informe!.fecha)}
                        </span>
                      </div>

                      {fila.causa && (
                        <p className="mt-2 text-sm">
                          {fila.severidad && (
                            <span
                              className={`mr-1.5 rounded px-1.5 py-0.5 text-[0.7rem] ${
                                NIVELES_HALLAZGO[fila.severidad].pastilla
                              }`}
                            >
                              {NIVELES_HALLAZGO[fila.severidad].corta}
                            </span>
                          )}
                          {fila.causa}
                        </p>
                      )}

                      {medidas.length > 0 && (
                        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                          {medidas.map(d => {
                            const cambio = cambios.find(c => c.clave === d.clave)
                            return (
                              <li key={d.clave} className="flex items-baseline justify-between gap-2">
                                <span className="min-w-0 truncate text-xs text-faint">
                                  {d.etiqueta}
                                </span>
                                <span className="shrink-0 font-mono text-xs">
                                  {fila.mediciones[d.clave]} {d.unidad}
                                  {cambio && (
                                    <span
                                      className={`ml-1 ${
                                        cambio.variacion > 0 ? 'text-naranja' : 'text-acero-dk'
                                      }`}
                                    >
                                      {cambio.variacion > 0 ? '+' : ''}
                                      {cambio.variacion}
                                    </span>
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      {(fila.gas_recuperado || fila.gas_cargado) && (
                        <p className="mt-2 font-mono text-xs text-faint">
                          {fila.gas_tipo ?? 'gas'}
                          {fila.gas_recuperado ? ` · ${fila.gas_recuperado} kg recuperados` : ''}
                          {fila.gas_cargado ? ` · ${fila.gas_cargado} kg cargados` : ''}
                        </p>
                      )}
                    </Tarjeta>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </Pantalla>
  )
}
