import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Boton, Buscador, Campo, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import { consultarProspectos, consultarRutas, crearProspecto, useConsulta } from '../lib/datos'
import { plural } from '../lib/formato'
import {
  ESTADOS_PROSPECTO, ORDEN_ESTADOS, RUBROS, ZONAS,
  type EstadoProspecto, type Prioridad, type Prospecto, type Ruta,
} from '../lib/tipos'

export function Prospectos() {
  // Se puede llegar desde una ruta: /prospectos?ruta=<id>. En ese caso se
  // muestran todos sus locales, no sólo los que faltan por visitar.
  const [parametros] = useSearchParams()
  const rutaInicial = parametros.get('ruta') ?? ''
  const [zona, setZona] = useState('')
  const [estados, setEstados] = useState<EstadoProspecto[]>(rutaInicial ? [] : ['por_visitar'])
  const [ruta, setRuta] = useState(rutaInicial)
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState(false)

  const rutas = useConsulta<Ruta[]>(() => consultarRutas(), [])
  const { datos, cargando, recargar } = useConsulta<Prospecto[]>(
    () =>
      consultarProspectos({
        zona: zona || undefined,
        estados: estados.length ? estados : undefined,
        rutaId: ruta && ruta !== 'sin' ? ruta : undefined,
        sinRuta: ruta === 'sin',
        busqueda: busqueda || undefined,
      }),
    [zona, estados.join(','), ruta, busqueda],
  )

  // alta de un local que no estaba en el mapa
  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState('Minimarket')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [zonaNueva, setZonaNueva] = useState('egana')
  const [prioridad, setPrioridad] = useState<Prioridad>('alta')

  async function agregar() {
    if (!nombre.trim()) return
    await crearProspecto({
      nombre: nombre.trim(),
      rubro,
      zona: zonaNueva,
      direccion: direccion || null,
      telefono: telefono || null,
      prioridad,
      estado: 'por_visitar',
    })
    setNombre('')
    setDireccion('')
    setTelefono('')
    setAbierta(false)
    void recargar()
  }

  function alternarEstado(e: EstadoProspecto) {
    setEstados(actuales =>
      actuales.includes(e) ? actuales.filter(x => x !== e) : [...actuales, e],
    )
  }

  const lista = datos ?? []

  return (
    <Pantalla
      titulo="Prospectos"
      bajada={cargando ? undefined : `${plural(lista.length, 'local', 'locales')} en la lista`}
      accion={
        <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Agregar local">
          <IconoAgregar />
        </Boton>
      }
    >
      <Buscador valor={busqueda} alCambiar={setBusqueda} marcador="Nombre, dirección o rubro" />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {[['', 'Todas las zonas'], ...Object.entries(ZONAS)].map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => setZona(valor)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              zona === valor ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setEstados([])}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
            estados.length === 0 ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
          }`}
        >
          Todos
        </button>
        {ORDEN_ESTADOS.map(e => {
          const pinta = ESTADOS_PROSPECTO[e]
          const activo = estados.includes(e)
          return (
            <button
              key={e}
              onClick={() => alternarEstado(e)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                activo ? 'border-grafito bg-white text-grafito' : 'border-linea-2 bg-white text-mut'
              }`}
            >
              <span className={`size-2 rounded-full ${pinta.punto}`} />
              {pinta.corta}
            </button>
          )
        })}
      </div>

      {(rutas.datos ?? []).length > 0 && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {[['', 'Toda la lista'], ['sin', 'Sin ruta'], ...(rutas.datos ?? []).map(r => [r.id, r.nombre] as [string, string])].map(
            ([valor, texto]) => (
              <button
                key={valor}
                onClick={() => setRuta(valor)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                  ruta === valor ? 'border-acero bg-acero/12 text-acero-dk' : 'border-linea-2 bg-white text-mut'
                }`}
              >
                {texto}
              </button>
            ),
          )}
        </div>
      )}

      <div className="mt-4">
        {cargando ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio texto="Ningún local con esos filtros." />
        ) : (
          <ul className="space-y-2">
            {lista.map(p => {
              const pinta = ESTADOS_PROSPECTO[p.estado]
              return (
                <li key={p.id}>
                  <Link to={`/prospectos/${p.id}`}>
                    <Tarjeta className={`border-l-4 p-3 ${pinta.borde}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.nombre}</p>
                          <p className="truncate text-sm text-mut">
                            {p.rubro}
                            {p.direccion ? ` · ${p.direccion}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${pinta.pastilla}`}>
                          {pinta.corta}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-faint">
                        <span>{ZONAS[p.zona ?? ''] ?? p.zona ?? 'Sin zona'}</span>
                        {p.prioridad === 'alta' && <span className="text-laton-dk">prioridad alta</span>}
                        {p.origen === 'manual' && <span>agregado a mano</span>}
                      </div>
                    </Tarjeta>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Hoja abierta={abierta} titulo="Agregar local" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Campo etiqueta="Nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} />
          <Selector
            etiqueta="Rubro"
            opciones={RUBROS.map(r => [r, r] as [string, string])}
            value={rubro}
            onChange={e => setRubro(e.target.value)}
          />
          <Selector
            etiqueta="Zona"
            opciones={Object.entries(ZONAS)}
            value={zonaNueva}
            onChange={e => setZonaNueva(e.target.value)}
          />
          <Campo etiqueta="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
          <Campo etiqueta="Teléfono" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
          <Selector
            etiqueta="Prioridad"
            opciones={[['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]}
            value={prioridad}
            onChange={e => setPrioridad(e.target.value as Prioridad)}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setAbierta(false)}>Cancelar</Boton>
            <Boton variante="acento" onClick={agregar}>Guardar local</Boton>
          </div>
        </div>
      </Hoja>
    </Pantalla>
  )
}
