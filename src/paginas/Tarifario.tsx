import { useState } from 'react'
import { Boton, Campo, Cargando, Confirmar, Hoja, Pantalla, Rotulo, Selector, Tarjeta, Vacio } from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import {
  borrarServicio, borrarTarifario, consultarClientes, consultarPrecios, consultarServicios,
  consultarTarifarios, crearServicio, crearTarifario, fijarPrecio, quitarPrecio, useConsulta,
} from '../lib/datos'
import { clp, conIva } from '../lib/formato'
import {
  CATEGORIAS, TIPOS_TARIFARIO, ZONAS,
  type CategoriaServicio, type Cliente, type PrecioTarifario, type Servicio, type Tarifario,
  type TipoTarifario,
} from '../lib/tipos'

/**
 * Tarifarios.
 *
 * Hay uno general y pueden existir otros por zona o por cliente. Un precio se
 * busca en el tarifario elegido y, si ahí no está, rige el general. Así un
 * tarifario especial sólo contiene lo que de verdad cambia.
 */
export function Tarifario() {
  const servicios = useConsulta<Servicio[]>(() => consultarServicios(), [])
  const tarifarios = useConsulta<Tarifario[]>(() => consultarTarifarios(), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])

  const lista = tarifarios.datos ?? []
  const base = lista.find(t => t.tipo === 'base')
  const [elegidoId, setElegidoId] = useState<string | null>(null)
  const actual = lista.find(t => t.id === elegidoId) ?? base ?? null

  const precios = useConsulta<PrecioTarifario[]>(
    () => consultarPrecios(actual?.id ?? '00000000-0000-0000-0000-000000000000'),
    [actual?.id],
  )
  const preciosBase = useConsulta<PrecioTarifario[]>(
    () => consultarPrecios(base?.id ?? '00000000-0000-0000-0000-000000000000'),
    [base?.id],
  )

  const [hoja, setHoja] = useState<'precio' | 'tarifario' | 'servicio' | null>(null)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [precio, setPrecio] = useState('')
  const [borrandoTarifario, setBorrandoTarifario] = useState(false)
  const [borrandoServicio, setBorrandoServicio] = useState<Servicio | null>(null)

  // nuevo tarifario
  const [nombreTarifario, setNombreTarifario] = useState('')
  const [tipoTarifario, setTipoTarifario] = useState<TipoTarifario>('zona')
  const [zonaTarifario, setZonaTarifario] = useState('egana')
  const [clienteTarifario, setClienteTarifario] = useState('')

  // nuevo servicio
  const [nombreServicio, setNombreServicio] = useState('')
  const [categoriaServicio, setCategoriaServicio] = useState<CategoriaServicio>('refrigeracion')
  const [unidadServicio, setUnidadServicio] = useState('equipo')
  const [precioServicio, setPrecioServicio] = useState('')

  const propio = new Map((precios.datos ?? []).map(p => [p.servicio_id, p.precio_neto]))
  const general = new Map((preciosBase.datos ?? []).map(p => [p.servicio_id, p.precio_neto]))

  function precioDe(s: Servicio): { valor: number; heredado: boolean } {
    const mio = propio.get(s.id)
    if (mio !== undefined) return { valor: mio, heredado: false }
    return { valor: general.get(s.id) ?? s.precio_neto, heredado: actual?.tipo !== 'base' }
  }

  async function guardarPrecio() {
    if (!editando || !actual) return
    await fijarPrecio(actual.id, editando.id, Number(precio) || 0)
    setHoja(null)
    setEditando(null)
    void precios.recargar()
    if (actual.tipo === 'base') void preciosBase.recargar()
  }

  async function volverAlGeneral() {
    if (!editando || !actual) return
    await quitarPrecio(actual.id, editando.id)
    setHoja(null)
    setEditando(null)
    void precios.recargar()
  }

  async function guardarTarifarioNuevo() {
    if (!nombreTarifario.trim()) return
    const { data } = await crearTarifario({
      nombre: nombreTarifario.trim(),
      tipo: tipoTarifario,
      zona: tipoTarifario === 'zona' ? zonaTarifario : null,
      cliente_id: tipoTarifario === 'cliente' ? clienteTarifario || null : null,
    })
    setNombreTarifario('')
    setHoja(null)
    await tarifarios.recargar()
    if (data) setElegidoId(data.id)
  }

  async function guardarServicioNuevo() {
    if (!nombreServicio.trim()) return
    const { data } = await crearServicio({
      nombre: nombreServicio.trim(),
      categoria: categoriaServicio,
      unidad: unidadServicio || 'equipo',
      precio_neto: Number(precioServicio) || 0,
      orden: 99,
    })
    // El precio nuevo entra al tarifario general, que es el que rige por defecto.
    if (data && base) await fijarPrecio(base.id, data.id, Number(precioServicio) || 0)
    setNombreServicio('')
    setPrecioServicio('')
    setHoja(null)
    void servicios.recargar()
    void preciosBase.recargar()
    void precios.recargar()
  }

  const cargando = servicios.cargando || tarifarios.cargando
  const items = servicios.datos ?? []

  return (
    <Pantalla
      titulo="Tarifario"
      bajada={actual ? `${actual.nombre} · valores netos` : 'Valores netos'}
      volver
      accion={
        <Boton variante="acento" onClick={() => setHoja('servicio')} aria-label="Agregar servicio">
          <IconoAgregar />
        </Boton>
      }
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {lista.map(t => (
          <button
            key={t.id}
            onClick={() => setElegidoId(t.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              actual?.id === t.id ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
            }`}
          >
            {t.nombre}
          </button>
        ))}
        <button
          onClick={() => setHoja('tarifario')}
          className="shrink-0 rounded-full border border-dashed border-linea-2 bg-white px-3 py-1.5 text-sm text-acero-dk"
        >
          + Otro tarifario
        </button>
      </div>

      {actual && actual.tipo !== 'base' && (
        <p className="mt-3 rounded-lg bg-tinte px-3 py-2 text-xs text-mut">
          {TIPOS_TARIFARIO[actual.tipo]}
          {actual.zona ? ` · ${ZONAS[actual.zona] ?? actual.zona}` : ''}. Los servicios sin precio
          propio usan el del tarifario general.
        </p>
      )}

      {cargando ? (
        <Cargando />
      ) : items.length === 0 ? (
        <Vacio texto="Sin servicios cargados." />
      ) : (
        <div className="mt-4 space-y-6">
          {(Object.keys(CATEGORIAS) as CategoriaServicio[]).map(categoria => {
            const deCategoria = items.filter(s => s.categoria === categoria)
            if (deCategoria.length === 0) return null
            return (
              <section key={categoria}>
                <Rotulo className="mb-2">{CATEGORIAS[categoria]}</Rotulo>
                <ul className="space-y-2">
                  {deCategoria.map(s => {
                    const { valor, heredado } = precioDe(s)
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setEditando(s)
                            setPrecio(String(valor))
                            setHoja('precio')
                          }}
                          className="w-full text-left"
                        >
                          <Tarjeta className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="text-sm">{s.nombre}</p>
                              <p className="text-xs text-faint">
                                por {s.unidad}
                                {heredado ? ' · precio general' : ''}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`font-mono text-sm font-medium ${heredado ? 'text-mut' : ''}`}>
                                {clp(valor)}
                              </p>
                              <p className="text-xs text-faint">{clp(conIva(valor))} c/IVA</p>
                            </div>
                          </Tarjeta>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {actual && actual.tipo !== 'base' && (
        <Boton variante="peligro" className="mt-6 w-full" onClick={() => setBorrandoTarifario(true)}>
          Borrar este tarifario
        </Boton>
      )}

      {/* ── Editar precio ── */}
      <Hoja abierta={hoja === 'precio'} titulo={editando?.nombre ?? ''} alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Campo
            etiqueta={`Precio neto en «${actual?.nombre ?? ''}»`}
            type="number"
            inputMode="numeric"
            autoFocus
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            pista={`Con IVA queda en ${clp(conIva(Number(precio) || 0))}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarPrecio}>Guardar precio</Boton>
          </div>
          {actual?.tipo !== 'base' && editando && propio.has(editando.id) && (
            <Boton className="w-full" onClick={volverAlGeneral}>
              Usar el precio del tarifario general
            </Boton>
          )}
          {actual?.tipo === 'base' && editando && (
            <Boton variante="peligro" className="w-full" onClick={() => setBorrandoServicio(editando)}>
              Quitar este servicio del tarifario
            </Boton>
          )}
        </div>
      </Hoja>

      {/* ── Nuevo tarifario ── */}
      <Hoja abierta={hoja === 'tarifario'} titulo="Nuevo tarifario" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Campo
            etiqueta="Nombre"
            autoFocus
            value={nombreTarifario}
            onChange={e => setNombreTarifario(e.target.value)}
            placeholder="Plaza Ñuñoa · campaña de invierno"
          />
          <Selector
            etiqueta="Tipo"
            opciones={[['zona', 'Por zona'], ['cliente', 'Por cliente']]}
            value={tipoTarifario}
            onChange={e => setTipoTarifario(e.target.value as TipoTarifario)}
          />
          {tipoTarifario === 'zona' ? (
            <Selector etiqueta="Zona" opciones={Object.entries(ZONAS)} value={zonaTarifario} onChange={e => setZonaTarifario(e.target.value)} />
          ) : (
            <Selector
              etiqueta="Cliente"
              opciones={[['', 'Elegir cliente'], ...(clientes.datos ?? []).map(c => [c.id, c.nombre] as [string, string])]}
              value={clienteTarifario}
              onChange={e => setClienteTarifario(e.target.value)}
            />
          )}
          <p className="text-xs text-faint">
            Parte vacío: todo rige con el precio general hasta que cambies un servicio acá.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarTarifarioNuevo}>Crear tarifario</Boton>
          </div>
        </div>
      </Hoja>

      {/* ── Nuevo servicio ── */}
      <Hoja abierta={hoja === 'servicio'} titulo="Agregar servicio" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Campo
            etiqueta="Nombre"
            autoFocus
            value={nombreServicio}
            onChange={e => setNombreServicio(e.target.value)}
            placeholder="Mantención de cortina de aire"
          />
          <Selector
            etiqueta="Categoría"
            opciones={Object.entries(CATEGORIAS)}
            value={categoriaServicio}
            onChange={e => setCategoriaServicio(e.target.value as CategoriaServicio)}
          />
          <Campo etiqueta="Unidad" value={unidadServicio} onChange={e => setUnidadServicio(e.target.value)} placeholder="equipo, visita, servicio" />
          <Campo
            etiqueta="Precio neto"
            type="number"
            inputMode="numeric"
            value={precioServicio}
            onChange={e => setPrecioServicio(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarServicioNuevo}>Agregar</Boton>
          </div>
        </div>
      </Hoja>

      <Confirmar
        abierta={borrandoTarifario}
        titulo="¿Borrar el tarifario?"
        detalle="Los clientes de ese tarifario vuelven a regirse por el general."
        textoAceptar="Borrar"
        peligro
        alCerrar={() => setBorrandoTarifario(false)}
        alAceptar={async () => {
          if (actual) await borrarTarifario(actual.id)
          setElegidoId(null)
          void tarifarios.recargar()
        }}
      />
      <Confirmar
        abierta={borrandoServicio !== null}
        titulo="¿Quitar el servicio?"
        detalle="Deja de aparecer en el tarifario y en los presupuestos nuevos. Los presupuestos ya hechos no cambian."
        textoAceptar="Quitar"
        peligro
        alCerrar={() => setBorrandoServicio(null)}
        alAceptar={async () => {
          if (borrandoServicio) await borrarServicio(borrandoServicio.id)
          setHoja(null)
          setEditando(null)
          void servicios.recargar()
        }}
      />
    </Pantalla>
  )
}
