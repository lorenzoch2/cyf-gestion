import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Aviso, Boton, Campo, Cargando, Hoja, Selector } from '../componentes/ui'
import { RegistroRapido, type Deshacer } from '../componentes/RegistroRapido'
import { IconoVolver } from '../componentes/iconos'
import {
  asignarRuta, consultarProspectos, consultarRutas, crearRuta, useConsulta,
} from '../lib/datos'
import { duracion, enlaceMapa, hoyIso, kilometros, plural } from '../lib/formato'
import { MAX_TRAZADO, trazarRecorrido, type Trazado } from '../lib/ruteo'
import {
  COLOR_ESTADO, ESTADOS_PROSPECTO, ORDEN_ESTADOS, ZONAS,
  type EstadoProspecto, type Prospecto, type Ruta,
} from '../lib/tipos'

/** Centro de la campaña: entre Plaza Ñuñoa y Plaza Egaña. */
const CENTRO: [number, number] = [-33.4558, -70.5888]

/** Lado de la celda de agrupación, en píxeles de pantalla. */
const CELDA = 58

/**
 * Qué estado manda en un grupo: el más avanzado de la conversación.
 *
 * Un grupo con un cliente adentro se pinta de verde aunque los otros nueve
 * estén por visitar. De lejos, lo que interesa ver es dónde ya hay algo.
 */
const PESO_ESTADO: EstadoProspecto[] = [
  'cliente', 'cotizado', 'evaluacion', 'interesado', 'visitado', 'por_visitar', 'descartado',
]

/** Número de parada, dibujado sobre el punto. */
function iconoParada(numero: number) {
  return L.divIcon({
    className: '',
    html:
      `<div style="width:22px;height:22px;border-radius:999px;background:#14181f;color:#f8f7f4;` +
      `font:600 11px/22px 'IBM Plex Mono',monospace;text-align:center;` +
      `box-shadow:0 0 0 2px #f8f7f4">${numero}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/** Grupo de locales encimados: cuántos son, y de qué color el que manda. */
function iconoGrupo(cuantos: number, color: string) {
  const lado = cuantos > 50 ? 44 : cuantos > 15 ? 38 : 32
  return L.divIcon({
    className: '',
    html:
      `<div style="width:${lado}px;height:${lado}px;border-radius:999px;background:#14181f;` +
      `color:#f8f7f4;font:600 ${lado > 38 ? 13 : 12}px/${lado - 6}px 'IBM Plex Sans',sans-serif;` +
      `text-align:center;border:3px solid ${color};box-shadow:0 1px 4px rgba(20,24,31,.35)">${cuantos}</div>`,
    iconSize: [lado, lado],
    iconAnchor: [lado / 2, lado / 2],
  })
}

/** Distancia aproximada en metros. A esta escala, el plano basta. */
function distancia(a: [number, number], b: [number, number]): number {
  const dx = (a[1] - b[1]) * 92000 // grados de longitud a metros en Santiago
  const dy = (a[0] - b[0]) * 111000
  return Math.hypot(dx, dy)
}

/** Ordena los locales como se caminarían: siempre al más cercano. */
function ordenarRecorrido(locales: Prospecto[], desde: [number, number]): Prospecto[] {
  const restantes = [...locales]
  const orden: Prospecto[] = []
  let actual = desde
  while (restantes.length) {
    let mejor = 0
    let mejorDistancia = Infinity
    restantes.forEach((p, i) => {
      const d = distancia(actual, [p.lat!, p.lng!])
      if (d < mejorDistancia) {
        mejorDistancia = d
        mejor = i
      }
    })
    const elegido = restantes.splice(mejor, 1)[0]
    orden.push(elegido)
    actual = [elegido.lat!, elegido.lng!]
  }
  return orden
}

/**
 * Encuadra el mapa sobre lo que se está mostrando.
 *
 * Va en un efecto y no en el render: encuadrar es tocar el mapa, y si se hace
 * mientras React dibuja, el contenedor todavía no tiene alto y el encuadre sale
 * mal — el mapa queda mirando media ciudad.
 */
function AjustarVista({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap()
  const clave = puntos.length + ':' + (puntos[0]?.join(',') ?? '')
  useEffect(() => {
    if (puntos.length === 0) return
    mapa.invalidateSize()
    if (puntos.length === 1) mapa.setView(puntos[0], 16)
    else mapa.fitBounds(puntos, { padding: [36, 36] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])
  return null
}

interface Grupo {
  centro: [number, number]
  items: Prospecto[]
}

/**
 * Los puntos del mapa, agrupados por cercanía en pantalla.
 *
 * La agrupación se calcula en píxeles al zoom actual: lo que se ve encimado se
 * junta, y al acercarse los grupos se abren solos. Con un recorrido planificado
 * no se agrupa nada — ahí lo que importa es ver cada parada con su número.
 */
function Pines({
  locales,
  recorrido,
  alRegistrar,
}: {
  locales: Prospecto[]
  recorrido: Prospecto[] | null
  alRegistrar: (p: Prospecto) => void
}) {
  const mapa = useMap()
  const [zoom, setZoom] = useState(() => mapa.getZoom())
  useMapEvents({ zoomend: () => setZoom(mapa.getZoom()) })

  const grupos = useMemo<Grupo[]>(() => {
    if (recorrido) return locales.map(p => ({ centro: [p.lat!, p.lng!] as [number, number], items: [p] }))
    const celdas = new Map<string, Prospecto[]>()
    for (const p of locales) {
      const punto = mapa.project([p.lat!, p.lng!], zoom)
      const clave = `${Math.floor(punto.x / CELDA)}:${Math.floor(punto.y / CELDA)}`
      const celda = celdas.get(clave)
      if (celda) celda.push(p)
      else celdas.set(clave, [p])
    }
    return [...celdas.values()].map(items => ({
      centro: [
        items.reduce((s, p) => s + p.lat!, 0) / items.length,
        items.reduce((s, p) => s + p.lng!, 0) / items.length,
      ] as [number, number],
      items,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locales, zoom, recorrido])

  return (
    <>
      {grupos.map(grupo => {
        if (grupo.items.length > 1) {
          const manda = PESO_ESTADO.find(e => grupo.items.some(p => p.estado === e)) ?? 'por_visitar'
          return (
            <Marker
              key={'grupo-' + grupo.items[0].id + '-' + grupo.items.length}
              position={grupo.centro}
              icon={iconoGrupo(grupo.items.length, COLOR_ESTADO[manda])}
              eventHandlers={{ click: () => mapa.setView(grupo.centro, Math.min(zoom + 2, 18)) }}
            />
          )
        }

        const p = grupo.items[0]
        const posicion = recorrido ? recorrido.findIndex(x => x.id === p.id) + 1 : 0
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat!, p.lng!]}
            radius={p.prioridad === 'alta' ? 8 : 6}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: COLOR_ESTADO[p.estado],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div className="min-w-[11rem]">
                <p className="text-sm font-semibold">
                  {posicion > 0 && <span className="text-mut">{posicion}. </span>}
                  {p.nombre}
                </p>
                <p className="mt-0.5 text-xs text-mut">
                  {[p.rubro, p.direccion].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-xs" style={{ color: COLOR_ESTADO[p.estado] }}>
                  {ESTADOS_PROSPECTO[p.estado].etiqueta}
                </p>
                <button
                  onClick={() => alRegistrar(p)}
                  className="mt-2 w-full rounded-lg bg-laton px-3 py-1.5 text-xs font-semibold text-grafito"
                >
                  Registrar visita
                </button>
                <div className="mt-2 flex gap-3">
                  <Link to={`/prospectos/${p.id}`} className="text-xs font-medium text-acero-dk">
                    Ver ficha
                  </Link>
                  <a
                    href={enlaceMapa(p.lat, p.lng, p.direccion) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-acero-dk"
                  >
                    Cómo llegar
                  </a>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {recorrido?.slice(0, MAX_TRAZADO).map((p, i) => (
        <Marker
          key={'parada-' + p.id}
          position={[p.lat!, p.lng!]}
          icon={iconoParada(i + 1)}
          interactive={false}
        />
      ))}
    </>
  )
}

/*
  `fadeAnimation` va apagada a propósito: con reencuadres seguidos —que es lo
  que pasa al cambiar filtros— Leaflet deja baldosas pegadas en opacidad cero y
  el mapa se ve desteñido.
*/
export function Mapa() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const [zona, setZona] = useState('')
  const [estados, setEstados] = useState<EstadoProspecto[]>([])
  const [ruta, setRuta] = useState(parametros.get('ruta') ?? '')
  const [recorrido, setRecorrido] = useState<Prospecto[] | null>(null)
  const [trazado, setTrazado] = useState<Trazado | null>(null)
  const [trazando, setTrazando] = useState(false)
  const [registrando, setRegistrando] = useState<Prospecto | null>(null)
  const [aviso, setAviso] = useState<Deshacer | null>(null)
  const [hoja, setHoja] = useState<'planificar' | 'guardar' | null>(null)
  const [nombreRuta, setNombreRuta] = useState('')
  const [fechaRuta, setFechaRuta] = useState(hoyIso())

  const rutas = useConsulta<Ruta[]>(() => consultarRutas(), [])
  const { datos, cargando, recargar } = useConsulta<Prospecto[]>(
    () =>
      consultarProspectos({
        zona: zona || undefined,
        estados: estados.length ? estados : undefined,
        rutaId: ruta && ruta !== 'sin' ? ruta : undefined,
        sinRuta: ruta === 'sin',
      }),
    [zona, estados.join(','), ruta],
  )

  const conMapa = (datos ?? []).filter(p => p.lat !== null && p.lng !== null)
  const sinMapa = (datos ?? []).length - conMapa.length
  const puntos = conMapa.map(p => [p.lat!, p.lng!] as [number, number])

  /*
    El camino por las calles se pregunta afuera, así que va en un efecto y no
    en el render. Si el recorrido cambia antes de que llegue la respuesta, la
    consulta anterior se aborta: lo que vuelve ya no corresponde a lo que se
    está mirando.

    El efecto solo consulta. Apagar la medición le toca a `cambiarRecorrido`,
    que es donde el recorrido cambia de verdad: poner estado dentro de un
    efecto encadena un render de más y la lista parpadea.
  */
  useEffect(() => {
    if (!recorrido || recorrido.length < 2) return
    const control = new AbortController()
    trazarRecorrido(
      recorrido.map(p => [p.lat!, p.lng!] as [number, number]),
      control.signal,
    )
      .then(t => {
        if (!control.signal.aborted) setTrazado(t)
      })
      .finally(() => {
        if (!control.signal.aborted) setTrazando(false)
      })
    return () => control.abort()
  }, [recorrido])

  /** Otro recorrido es otro camino: lo medido ya no sirve. */
  function cambiarRecorrido(nuevo: Prospecto[] | null) {
    setRecorrido(nuevo)
    setTrazado(null)
    setTrazando(nuevo !== null && nuevo.length > 1)
  }

  function alternarEstado(e: EstadoProspecto) {
    cambiarRecorrido(null)
    setEstados(a => (a.includes(e) ? a.filter(x => x !== e) : [...a, e]))
  }

  function planificar() {
    if (conMapa.length === 0) return
    // Ya está ordenado: el botón pasa a ser «ver», y no se vuelve a pedir la
    // ubicación ni a medir las calles de nuevo.
    if (recorrido) {
      setHoja('planificar')
      return
    }
    navigator.geolocation?.getCurrentPosition(
      pos => cambiarRecorrido(ordenarRecorrido(conMapa, [pos.coords.latitude, pos.coords.longitude])),
      () => cambiarRecorrido(ordenarRecorrido(conMapa, [conMapa[0].lat!, conMapa[0].lng!])),
      { timeout: 5000 },
    )
    // Si el navegador no responde rápido, igual se ordena desde el primer local.
    if (!navigator.geolocation) {
      cambiarRecorrido(ordenarRecorrido(conMapa, [conMapa[0].lat!, conMapa[0].lng!]))
    }
    setHoja('planificar')
  }

  /** Google Maps acepta hasta nueve paradas intermedias en un enlace. */
  function abrirEnGoogleMaps() {
    const orden = recorrido ?? conMapa
    if (orden.length === 0) return
    const parada = (p: Prospecto) => `${p.lat},${p.lng}`
    const origen = parada(orden[0])
    const resto = orden.slice(1, 10)
    const destino = resto.length ? parada(resto[resto.length - 1]) : origen
    const intermedias = resto.slice(0, -1).map(parada).join('|')
    const url =
      `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origen}&destination=${destino}` +
      (intermedias ? `&waypoints=${intermedias}` : '')
    window.open(url, '_blank')
  }

  async function guardarComoRuta() {
    if (!nombreRuta.trim() || conMapa.length === 0) return
    const { data } = await crearRuta({
      nombre: nombreRuta.trim(),
      zona: zona || conMapa[0].zona,
      fecha: fechaRuta || null,
      estado: 'planificada',
    })
    if (data) {
      const orden = recorrido ?? conMapa
      await asignarRuta(orden.map(p => p.id), data.id)
      await rutas.recargar()
      setRuta(data.id)
    }
    setNombreRuta('')
    setHoja(null)
    void recargar()
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="sobre-seguro z-20 border-b border-linea bg-papel/95">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navegar(-1)} aria-label="Volver" className="-ml-1 text-mut">
            <IconoVolver />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.35rem] font-semibold tracking-tight">Mapa</h1>
            <p className="text-sm text-mut">
              {cargando ? 'Cargando…' : plural(conMapa.length, 'local', 'locales')}
              {sinMapa > 0 && ` · ${sinMapa} sin ubicación`}
            </p>
          </div>
          <Link to="/prospectos">
            <Boton className="min-h-9 px-3 text-sm">Lista</Boton>
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {[['', 'Todas'], ...Object.entries(ZONAS)].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => {
                setZona(valor)
                cambiarRecorrido(null)
              }}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
                zona === valor ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
              }`}
            >
              {texto}
            </button>
          ))}
          <span className="w-px shrink-0 bg-linea" />
          {ORDEN_ESTADOS.map(e => {
            const pinta = ESTADOS_PROSPECTO[e]
            const activo = estados.includes(e)
            return (
              <button
                key={e}
                onClick={() => alternarEstado(e)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  activo ? 'border-grafito bg-white' : 'border-linea-2 bg-white text-mut'
                }`}
              >
                <span className={`size-2 rounded-full ${pinta.punto}`} />
                {pinta.corta}
              </button>
            )
          })}
        </div>
      </header>

      <div className="relative flex-1 pb-[4.25rem]">
        {cargando ? (
          <Cargando />
        ) : (
          <MapContainer
            center={CENTRO}
            zoom={14}
            className="h-full w-full"
            preferCanvas
            fadeAnimation={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <AjustarVista puntos={puntos} />

            {/*
              El camino va en dos líneas: un realce claro debajo y el acero
              arriba. Sobre las baldosas de OSM una línea sola se pierde entre
              las calles impresas. Mientras se mide —o si el servicio no
              responde— queda la recta punteada, que no engaña a nadie.
            */}
            {recorrido && recorrido.length > 1 && (
              trazado ? (
                <>
                  <Polyline
                    positions={trazado.linea}
                    pathOptions={{ color: '#f8f7f4', weight: 8, opacity: 0.9 }}
                  />
                  <Polyline
                    positions={trazado.linea}
                    pathOptions={{ color: '#4f73a8', weight: 4 }}
                  />
                </>
              ) : (
                <Polyline
                  positions={recorrido.map(p => [p.lat!, p.lng!] as [number, number])}
                  pathOptions={{ color: '#14181f', weight: 2, dashArray: '6 6', opacity: 0.6 }}
                />
              )
            )}

            <Pines locales={conMapa} recorrido={recorrido} alRegistrar={setRegistrando} />
          </MapContainer>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-[1000] flex justify-center px-4">
          <Boton variante="acento" className="pointer-events-auto shadow-lg" onClick={planificar}>
            {recorrido ? 'Recorrido listo · ver' : 'Planificar recorrido'}
          </Boton>
        </div>
      </div>

      <RegistroRapido
        prospecto={registrando}
        alCerrar={() => setRegistrando(null)}
        alGuardar={d => {
          setAviso(d)
          void recargar()
        }}
      />

      {aviso && (
        <Aviso
          mensaje={aviso.mensaje}
          accion={async () => {
            await aviso.revertir()
            void recargar()
          }}
          alCerrar={() => setAviso(null)}
        />
      )}

      <Hoja abierta={hoja === 'planificar'} titulo="Recorrido" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <p className="text-sm text-mut">
            {plural((recorrido ?? conMapa).length, 'parada', 'paradas')}, ordenadas desde donde
            estás hacia el local más cercano en cada paso.
          </p>
          <p className="text-sm">
            {trazando ? (
              <span className="text-faint">Midiendo el camino por las calles…</span>
            ) : trazado ? (
              <span className="font-mono text-acero-dk">
                {kilometros(trazado.metros)} · {duracion(trazado.segundos)} a pie
                {(recorrido ?? conMapa).length > MAX_TRAZADO && ` · primeras ${MAX_TRAZADO}`}
              </span>
            ) : (
              <span className="text-faint">
                Sin medición por calles: el trazo del mapa es en línea recta.
              </span>
            )}
          </p>
          <ol className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-linea bg-white p-3 text-sm">
            {(recorrido ?? conMapa).slice(0, MAX_TRAZADO).map((p, i) => {
              const tramo = i > 0 ? trazado?.tramos[i - 1] : undefined
              return (
                <li key={p.id} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                  {tramo && (
                    <span className="shrink-0 font-mono text-xs text-faint">
                      {/* Dos locales de la misma cuadra son «40 m», no «0 min». */}
                      {tramo.segundos < 60 ? kilometros(tramo.metros) : duracion(tramo.segundos)}
                    </span>
                  )}
                </li>
              )
            })}
            {(recorrido ?? conMapa).length > MAX_TRAZADO && (
              <li className="pt-1 text-xs text-faint">
                y {(recorrido ?? conMapa).length - MAX_TRAZADO} más en el orden calculado
              </li>
            )}
          </ol>
          <Boton variante="acento" className="w-full" onClick={abrirEnGoogleMaps}>
            Abrir en Google Maps
          </Boton>
          <p className="text-xs text-faint">
            Google Maps acepta diez paradas por enlace: si el recorrido es más largo, abre las
            primeras diez y después se repite con el resto.
          </p>
          <Boton className="w-full" onClick={() => setHoja('guardar')}>
            Guardar como ruta
          </Boton>
        </div>
      </Hoja>

      <Hoja abierta={hoja === 'guardar'} titulo="Guardar como ruta" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <p className="text-sm text-mut">
            Los {conMapa.length} locales que estás viendo quedan asignados a esta ruta.
          </p>
          <Campo
            etiqueta="Nombre"
            autoFocus
            value={nombreRuta}
            onChange={e => setNombreRuta(e.target.value)}
            placeholder="Irarrázabal poniente, martes"
          />
          <Campo etiqueta="Fecha" type="date" value={fechaRuta} onChange={e => setFechaRuta(e.target.value)} />
          <Selector
            etiqueta="Zona"
            opciones={Object.entries(ZONAS)}
            value={zona || conMapa[0]?.zona || 'egana'}
            onChange={e => setZona(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarComoRuta}>Guardar ruta</Boton>
          </div>
        </div>
      </Hoja>
    </div>
  )
}
