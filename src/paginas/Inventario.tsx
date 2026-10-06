import { useMemo, useState } from 'react'
import {
  Area, Boton, Buscador, Campo, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  borrarCotizacionInsumo, consultarCatalogo, consultarCotizacionesInsumo, consultarExistencias,
  consultarTecnicos, crearCotizacionInsumo, crearInsumo, fijarExistencia, marcarComprada,
  useConsulta,
} from '../lib/datos'
import { clp, conIva, fechaCorta } from '../lib/formato'
import {
  AMBITOS, ESTADOS_COTIZACION, ESTADOS_EXISTENCIA, ORDEN_EXISTENCIA,
  type CotizacionInsumo, type Existencia, type Insumo, type EstadoExistencia, type Tecnico,
} from '../lib/tipos'

/*
  El inventario.

  Dos listas distintas que la pantalla junta: el catálogo —lo que corresponde
  tener, con su ámbito— y las existencias —lo que hay, y de quién es—. Un ítem
  sin fila de existencia no es un error: es algo que todavía no se ha revisado,
  y se muestra como «falta» hasta que alguien diga otra cosa.

  El selector de dueño cambia qué catálogo se mira: con un técnico elegido se
  ve solo su caja (ámbito T), que es la pregunta «¿tienen los dos lo mismo?».
*/

/** Clave de una existencia: el ítem y su dueño, con «nadie» como dueño válido. */
function llave(insumoId: string, tecnicoId: string | null) {
  return insumoId + '|' + (tecnicoId ?? 'taller')
}

export function Inventario() {
  const [dueno, setDueno] = useState('taller')
  const [estados, setEstados] = useState<EstadoExistencia[]>([])
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Insumo | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const tecnicos = useConsulta<Tecnico[]>(() => consultarTecnicos(true), [])
  const catalogo = useConsulta<Insumo[]>(() => consultarCatalogo(), [])
  const existencias = useConsulta<Existencia[]>(() => consultarExistencias(), [])

  const porLlave = useMemo(() => {
    const mapa = new Map<string, Existencia>()
    for (const e of existencias.datos ?? []) mapa.set(llave(e.insumo_id, e.tecnico_id), e)
    return mapa
  }, [existencias.datos])

  const esTecnico = dueno !== 'taller' && dueno !== 'todo'
  const tecnicoId = esTecnico ? dueno : null

  /** El estado que se muestra para un ítem, según el dueño que se esté mirando. */
  function estadoDe(insumo: Insumo): EstadoExistencia {
    if (dueno === 'todo') {
      const suyas = (existencias.datos ?? []).filter(e => e.insumo_id === insumo.id)
      if (suyas.some(e => e.estado === 'tiene')) return 'tiene'
      if (suyas.length === 0) return 'falta'
      return ORDEN_EXISTENCIA.find(x => suyas.some(e => e.estado === x)) ?? 'falta'
    }
    return porLlave.get(llave(insumo.id, tecnicoId))?.estado ?? 'falta'
  }

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return (catalogo.datos ?? []).filter(i => {
      // Con un técnico elegido se mira su caja; en el taller, lo que no es personal.
      if (esTecnico && i.ambito !== 'T') return false
      if (dueno === 'taller' && i.ambito === 'T') return false
      if (soloCriticos && !i.critico) return false
      if (estados.length && !estados.includes(estadoDe(i))) return false
      if (texto && !(i.nombre + ' ' + i.codigo + ' ' + i.categoria).toLowerCase().includes(texto)) {
        return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo.datos, porLlave, existencias.datos, dueno, estados, soloCriticos, busqueda])

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, Insumo[]>()
    for (const i of visibles) {
      const g = grupos.get(i.categoria)
      if (g) g.push(i)
      else grupos.set(i.categoria, [i])
    }
    return [...grupos.entries()]
  }, [visibles])

  const tengo = visibles.filter(i => estadoDe(i) === 'tiene').length
  const faltanCriticos = visibles.filter(i => i.critico && estadoDe(i) !== 'tiene').length

  function recargar() {
    void existencias.recargar()
    void catalogo.recargar()
  }

  function alternar(e: EstadoExistencia) {
    setEstados(a => (a.includes(e) ? a.filter(x => x !== e) : [...a, e]))
  }

  const opcionesDueno: [string, string][] = [
    ['taller', 'Taller y camioneta'],
    ...(tecnicos.datos ?? []).map(t => [t.id, t.nombre] as [string, string]),
    ['todo', 'Todo junto'],
  ]

  return (
    <Pantalla
      titulo="Inventario"
      bajada={
        catalogo.cargando
          ? 'Cargando…'
          : `${tengo} de ${visibles.length}` +
            (faltanCriticos ? ` · faltan ${faltanCriticos} críticos` : '')
      }
      accion={
        <Boton className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Agregar
        </Boton>
      }
    >
      <div className="space-y-3">
        <Selector
          opciones={opcionesDueno}
          value={dueno}
          onChange={e => setDueno(e.target.value)}
        />

        <Buscador valor={busqueda} alCambiar={setBusqueda} marcador="Buscar herramienta o código" />

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setSoloCriticos(v => !v)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm ${
              soloCriticos ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
            }`}
          >
            Solo críticos
          </button>
          <span className="w-px shrink-0 bg-linea" />
          {ORDEN_EXISTENCIA.map(e => {
            const pinta = ESTADOS_EXISTENCIA[e]
            const activo = estados.includes(e)
            return (
              <button
                key={e}
                onClick={() => alternar(e)}
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
      </div>

      {catalogo.cargando ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <Vacio texto="Nada que mostrar con estos filtros." />
      ) : (
        <div className="mt-4 space-y-5">
          {porCategoria.map(([categoria, items]) => (
            <section key={categoria}>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
                {categoria}
              </h2>
              <ul className="space-y-2">
                {items.map(i => {
                  const estado = estadoDe(i)
                  const pinta = ESTADOS_EXISTENCIA[estado]
                  const fila = porLlave.get(llave(i.id, tecnicoId))
                  return (
                    <li key={i.id}>
                      <button onClick={() => setAbierto(i)} className="block w-full text-left">
                        <Tarjeta className={`border-l-4 p-3 ${pinta.borde}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                {i.nombre}
                                {i.critico && (
                                  <span className="ml-1.5 text-laton-dk" title="Crítico">
                                    ·
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 flex gap-2 font-mono text-xs text-faint">
                                <span>{i.codigo}</span>
                                <span>{AMBITOS[i.ambito].corta}</span>
                                {fila?.cantidad ? (
                                  <span>
                                    {fila.cantidad} {i.unidad}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${pinta.pastilla}`}
                            >
                              {pinta.corta}
                            </span>
                          </div>
                        </Tarjeta>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {abierto && (
        <HojaInsumo
          insumo={abierto}
          existencia={porLlave.get(llave(abierto.id, tecnicoId)) ?? null}
          tecnicoId={tecnicoId}
          tecnicos={tecnicos.datos ?? []}
          alCerrar={() => setAbierto(null)}
          alGuardar={recargar}
        />
      )}

      <HojaNuevo abierta={nuevo} alCerrar={() => setNuevo(false)} alGuardar={recargar} />
    </Pantalla>
  )
}

/* ── La ficha de un ítem ────────────────────────────────────────────────── */

function HojaInsumo({
  insumo,
  existencia,
  tecnicoId,
  tecnicos,
  alCerrar,
  alGuardar,
}: {
  insumo: Insumo
  existencia: Existencia | null
  tecnicoId: string | null
  tecnicos: Tecnico[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [cantidad, setCantidad] = useState(String(existencia?.cantidad ?? insumo.cantidad_objetivo))
  const [marca, setMarca] = useState(existencia?.marca ?? '')
  const [ubicacion, setUbicacion] = useState(existencia?.ubicacion ?? '')
  const [nota, setNota] = useState(existencia?.nota ?? '')
  const [cotizando, setCotizando] = useState(false)

  const cotizaciones = useConsulta<CotizacionInsumo[]>(
    () => consultarCotizacionesInsumo(insumo.id),
    [insumo.id],
  )

  async function fijar(estado: EstadoExistencia) {
    await fijarExistencia(insumo.id, tecnicoId, {
      estado,
      cantidad: estado === 'tiene' ? Number(cantidad) || 1 : 0,
      marca: marca.trim() || null,
      ubicacion: ubicacion.trim() || null,
      nota: nota.trim() || null,
    })
    alGuardar()
    alCerrar()
  }

  async function guardarDatos() {
    await fijarExistencia(insumo.id, tecnicoId, {
      estado: existencia?.estado ?? 'falta',
      cantidad: Number(cantidad) || 0,
      marca: marca.trim() || null,
      ubicacion: ubicacion.trim() || null,
      nota: nota.trim() || null,
    })
    alGuardar()
    alCerrar()
  }

  const duenoTexto = tecnicoId
    ? (tecnicos.find(t => t.id === tecnicoId)?.nombre ?? 'ese técnico')
    : 'el taller'

  return (
    <Hoja abierta titulo={insumo.nombre} alCerrar={alCerrar}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 font-mono text-xs text-faint">
          <span>{insumo.codigo}</span>
          <span>{AMBITOS[insumo.ambito].etiqueta}</span>
          <span>
            objetivo: {insumo.cantidad_objetivo} {insumo.unidad}
          </span>
          {insumo.critico && <span className="text-laton-dk">crítico</span>}
          {insumo.consumible && <span>consumible</span>}
        </div>

        {insumo.nota && <p className="text-sm text-mut">{insumo.nota}</p>}

        <div>
          <p className="mb-1.5 text-sm font-medium text-mut">Estado para {duenoTexto}</p>
          <div className="grid grid-cols-2 gap-2">
            {ORDEN_EXISTENCIA.map(e => {
              const pinta = ESTADOS_EXISTENCIA[e]
              const activo = (existencia?.estado ?? 'falta') === e
              return (
                <button
                  key={e}
                  onClick={() => void fijar(e)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    activo ? 'border-grafito bg-white font-medium' : 'border-linea-2 bg-white text-mut'
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${pinta.punto}`} />
                  {pinta.etiqueta}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Campo
            etiqueta="Cantidad"
            type="number"
            inputMode="decimal"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
          />
          <Campo etiqueta="Marca" value={marca} onChange={e => setMarca(e.target.value)} />
        </div>
        <Campo
          etiqueta="Dónde está"
          value={ubicacion}
          onChange={e => setUbicacion(e.target.value)}
          placeholder="Taller, camioneta, caja chica"
        />
        <Area etiqueta="Nota" value={nota} onChange={e => setNota(e.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-mut">Cotizaciones</p>
            <button
              onClick={() => setCotizando(v => !v)}
              className="text-sm font-medium text-acero-dk"
            >
              {cotizando ? 'Cancelar' : 'Cotizar'}
            </button>
          </div>

          {cotizando && (
            <FormularioCotizacion
              insumoId={insumo.id}
              cantidad={Number(cantidad) || 1}
              alGuardar={() => {
                setCotizando(false)
                void cotizaciones.recargar()
              }}
            />
          )}

          <ul className="mt-2 space-y-2">
            {(cotizaciones.datos ?? []).map(c => (
              <li key={c.id} className="rounded-lg border border-linea bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.proveedor}</p>
                    <p className="font-mono text-xs text-faint">
                      {clp(c.precio_neto)} neto · {clp(conIva(c.precio_neto ?? 0))} con IVA ·{' '}
                      {fechaCorta(c.fecha)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[0.7rem] text-faint">
                    {ESTADOS_COTIZACION[c.estado]}
                  </span>
                </div>
                {c.estado !== 'comprada' && (
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={async () => {
                        await marcarComprada(c, tecnicoId)
                        alGuardar()
                        alCerrar()
                      }}
                      className="text-xs font-medium text-acero-dk"
                    >
                      Ya lo compramos
                    </button>
                    <button
                      onClick={async () => {
                        await borrarCotizacionInsumo(c.id)
                        void cotizaciones.recargar()
                      }}
                      className="text-xs font-medium text-faint"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Boton variante="acento" className="w-full" onClick={() => void guardarDatos()}>
          Guardar
        </Boton>
      </div>
    </Hoja>
  )
}

function FormularioCotizacion({
  insumoId,
  cantidad,
  alGuardar,
}: {
  insumoId: string
  cantidad: number
  alGuardar: () => void
}) {
  const [proveedor, setProveedor] = useState('')
  const [precio, setPrecio] = useState('')
  const [telefono, setTelefono] = useState('')

  async function guardar() {
    if (!proveedor.trim()) return
    await crearCotizacionInsumo({
      insumo_id: insumoId,
      proveedor: proveedor.trim(),
      telefono: telefono.trim() || null,
      precio_neto: Number(precio) || null,
      cantidad,
      estado: 'recibida',
    })
    alGuardar()
  }

  return (
    <div className="space-y-2 rounded-lg border border-linea bg-tinte/50 p-3">
      <Campo
        etiqueta="Proveedor"
        autoFocus
        value={proveedor}
        onChange={e => setProveedor(e.target.value)}
        placeholder="Refrimarket, Vulco, Sodimac"
      />
      <div className="grid grid-cols-2 gap-2">
        <Campo
          etiqueta="Precio neto"
          type="number"
          inputMode="numeric"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
        />
        <Campo
          etiqueta="Teléfono"
          type="tel"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
        />
      </div>
      <Boton className="w-full" onClick={() => void guardar()}>
        Guardar cotización
      </Boton>
    </div>
  )
}

/* ── Agregar algo que no está en el catálogo ────────────────────────────── */

function HojaNuevo({
  abierta,
  alCerrar,
  alGuardar,
}: {
  abierta: boolean
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('Herramientas manuales')
  const [ambito, setAmbito] = useState('E')
  const [unidad, setUnidad] = useState('unidad')

  async function guardar() {
    if (!nombre.trim()) return
    // Los códigos propios van con «X-» para no chocar con los del catálogo.
    const codigo = 'X-' + Date.now().toString(36).toUpperCase().slice(-5)
    await crearInsumo({
      codigo,
      nombre: nombre.trim(),
      categoria,
      ambito: ambito as Insumo['ambito'],
      unidad,
      cantidad_objetivo: 1,
      orden: 9000,
    })
    setNombre('')
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja abierta={abierta} titulo="Agregar al catálogo" alCerrar={alCerrar}>
      <div className="space-y-3">
        <p className="text-sm text-mut">
          Para lo que la empresa use y no esté en la lista base. Lo que sobra se puede dar de baja
          desde su ficha.
        </p>
        <Campo
          etiqueta="Nombre"
          autoFocus
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
        <Campo etiqueta="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Selector
            etiqueta="De quién es"
            opciones={Object.entries(AMBITOS).map(([k, v]) => [k, v.etiqueta] as [string, string])}
            value={ambito}
            onChange={e => setAmbito(e.target.value)}
          />
          <Campo etiqueta="Unidad" value={unidad} onChange={e => setUnidad(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Agregar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}
