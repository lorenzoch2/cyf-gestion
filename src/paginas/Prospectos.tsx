import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Area, Aviso, Boton, Buscador, Campo, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { RegistroRapido, type Deshacer } from '../componentes/RegistroRapido'
import { useBorrador } from '../lib/borrador'
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
  const [registrando, setRegistrando] = useState<Prospecto | null>(null)
  const [aviso, setAviso] = useState<Deshacer | null>(null)

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

  /*
    Alta de un local que no estaba en el mapa.

    Va en un borrador y no en estados sueltos: se llena parado en la puerta,
    con una mano, y cualquier cosa lo interrumpe. Volver a escribir el nombre,
    el rubro, quién atendió y la nota es trabajo que nadie hace dos veces, así
    que el dato se perdería.
  */
  const local = useBorrador('local-nuevo', {
    nombre: '',
    rubro: 'Minimarket',
    direccion: '',
    telefono: '',
    zona: 'egana',
    prioridad: 'alta' as Prioridad,
    contacto: '',
    nota: '',
  })

  /*
    La ubicación se toma del teléfono, estando parado en la puerta.

    Un local agregado a mano sin coordenadas no aparece nunca en el mapa, y el
    mapa es la pantalla con que se sale a la calle: el local quedaría guardado
    y a la vez invisible justo donde hace falta verlo.
  */
  const [ubicacion, setUbicacion] = useState<[number, number] | null>(null)
  const [tomando, setTomando] = useState(false)

  function tomarUbicacion() {
    if (!navigator.geolocation) return
    setTomando(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUbicacion([pos.coords.latitude, pos.coords.longitude])
        setTomando(false)
      },
      () => setTomando(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function agregar() {
    const v = local.valor
    if (!v.nombre.trim()) return
    await crearProspecto({
      nombre: v.nombre.trim(),
      rubro: v.rubro,
      zona: v.zona,
      direccion: v.direccion.trim() || null,
      telefono: v.telefono.trim() || null,
      contacto_nombre: v.contacto.trim() || null,
      notas: v.nota.trim() || null,
      lat: ubicacion?.[0] ?? null,
      lng: ubicacion?.[1] ?? null,
      prioridad: v.prioridad,
      estado: 'por_visitar',
      origen: 'manual',
    })
    local.olvidar()
    setUbicacion(null)
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
        <div className="flex gap-2">
          <Link to="/mapa">
            <Boton className="min-h-9 px-3 text-sm">Mapa</Boton>
          </Link>
          <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Agregar local">
            <IconoAgregar />
          </Boton>
        </div>
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
                  <Tarjeta className={`border-l-4 p-3 ${pinta.borde}`}>
                    <Link to={`/prospectos/${p.id}`} className="block">
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
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 truncate text-xs text-faint">
                        {ZONAS[p.zona ?? ''] ?? p.zona ?? 'Sin zona'}
                        {p.prioridad === 'alta' && <span className="text-laton-dk">prioridad alta</span>}
                        {p.origen === 'manual' && <span>agregado a mano</span>}
                      </span>
                      <button
                        onClick={() => setRegistrando(p)}
                        className="shrink-0 rounded-lg border border-linea-2 px-2.5 py-1 text-xs font-medium text-acero-dk active:bg-tinte"
                      >
                        Registrar
                      </button>
                    </div>
                  </Tarjeta>
                </li>
              )
            })}
          </ul>
        )}
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

      <Hoja abierta={abierta} titulo="Agregar local" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          {local.recuperado && (
            <p className="rounded-lg bg-tinte px-3 py-2 text-xs text-mut">
              Recuperado lo que habías escrito antes. Todavía no está guardado.
            </p>
          )}
          <Campo
            etiqueta="Nombre"
            autoFocus
            value={local.valor.nombre}
            onChange={e => local.fijar({ nombre: e.target.value })}
          />
          <Selector
            etiqueta="Rubro"
            opciones={RUBROS.map(r => [r, r] as [string, string])}
            value={local.valor.rubro}
            onChange={e => local.fijar({ rubro: e.target.value })}
          />
          <Selector
            etiqueta="Zona"
            opciones={Object.entries(ZONAS)}
            value={local.valor.zona}
            onChange={e => local.fijar({ zona: e.target.value })}
          />
          <Campo
            etiqueta="Dirección"
            value={local.valor.direccion}
            onChange={e => local.fijar({ direccion: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Campo
              etiqueta="Quién atendió"
              value={local.valor.contacto}
              onChange={e => local.fijar({ contacto: e.target.value })}
              placeholder="Sra. Marta, dueña"
            />
            <Campo
              etiqueta="Teléfono"
              inputMode="tel"
              value={local.valor.telefono}
              onChange={e => local.fijar({ telefono: e.target.value })}
            />
          </div>
          <Area
            etiqueta="Nota"
            rows={2}
            value={local.valor.nota}
            onChange={e => local.fijar({ nota: e.target.value })}
            placeholder="Tiene dos visicooler y un split. El de atrás escarcha."
          />

          <div>
            <Boton className="w-full" disabled={tomando} onClick={tomarUbicacion}>
              {tomando
                ? 'Tomando ubicación…'
                : ubicacion
                  ? 'Ubicación tomada · volver a tomar'
                  : 'Usar mi ubicación'}
            </Boton>
            <p className="mt-1 text-xs text-faint">
              {ubicacion
                ? 'Queda con pin en el mapa, donde estás parado.'
                : 'Sin esto el local se guarda, pero no aparece en el mapa.'}
            </p>
          </div>
          <Selector
            etiqueta="Prioridad"
            opciones={[['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]}
            value={local.valor.prioridad}
            onChange={e => local.fijar({ prioridad: e.target.value as Prioridad })}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setAbierta(false)}>Después</Boton>
            <Boton variante="acento" onClick={agregar}>Guardar local</Boton>
          </div>
          <button
            onClick={() => {
              local.olvidar()
              setUbicacion(null)
              setAbierta(false)
            }}
            className="w-full text-xs text-faint"
          >
            Descartar lo escrito
          </button>
        </div>
      </Hoja>
    </Pantalla>
  )
}
