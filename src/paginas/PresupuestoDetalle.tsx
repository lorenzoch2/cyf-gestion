import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Boton, Campo, Cargando, Confirmar, Dato, Error, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  borrarLinea, borrarPresupuesto, consultarCliente, consultarLineas, consultarPresupuesto,
  consultarProspecto, consultarServicios, crearLinea, guardarPresupuesto, tarifarioQueAplica,
  useConsulta,
} from '../lib/datos'
import { clp, conIva, fechaCorta } from '../lib/formato'
import {
  CATEGORIAS, ESTADOS_PRESUPUESTO,
  type Cliente, type EstadoPresupuesto, type LineaPresupuesto, type Presupuesto,
  type Prospecto, type Servicio,
} from '../lib/tipos'

/** Un id que no existe: deja la consulta vacía cuando no hay a quién buscar. */
const NINGUNO = '00000000-0000-0000-0000-000000000000'

export function PresupuestoDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { datos: p, cargando, error, recargar } = useConsulta<Presupuesto>(() => consultarPresupuesto(id), [id])
  const lineas = useConsulta<LineaPresupuesto[]>(() => consultarLineas(id), [id])
  const servicios = useConsulta<Servicio[]>(() => consultarServicios(), [])
  const tarifa = useConsulta(
    () => tarifarioQueAplica(p?.cliente_id ?? null, null).then(data => ({ data, error: null })),
    [p?.cliente_id],
  )

  const cliente = useConsulta<Cliente>(() => consultarCliente(p?.cliente_id ?? NINGUNO), [p?.cliente_id])
  const prospecto = useConsulta<Prospecto>(() => consultarProspecto(p?.prospecto_id ?? NINGUNO), [p?.prospecto_id])

  const [generando, setGenerando] = useState(false)
  const [hoja, setHoja] = useState<'linea' | 'ajustes' | null>(null)
  const [confirmando, setConfirmando] = useState<'presupuesto' | LineaPresupuesto | null>(null)

  const [servicioId, setServicioId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')

  const [estado, setEstado] = useState<EstadoPresupuesto>('borrador')
  const [descuento, setDescuento] = useState('0')

  if (cargando) return <Cargando />
  if (error || !p) {
    return (
      <Pantalla titulo="Presupuesto" volver>
        <Error mensaje={error ?? 'No se encontró'} />
      </Pantalla>
    )
  }

  const items = lineas.datos ?? []
  const neto = items.reduce((t, l) => t + l.cantidad * l.precio_unitario_neto, 0)
  const rebaja = Math.round((neto * Number(p.descuento_pct)) / 100)
  const netoFinal = neto - rebaja
  const total = conIva(netoFinal)
  const precios = tarifa.datos?.precios ?? {}

  function elegirServicio(valor: string) {
    setServicioId(valor)
    const s = (servicios.datos ?? []).find(x => x.id === valor)
    if (s) {
      setDescripcion(s.nombre)
      // El precio sale del tarifario que le toca a este cliente.
      setPrecio(String(precios[s.id] ?? s.precio_neto))
    }
  }

  async function agregarLinea() {
    if (!descripcion.trim()) return
    await crearLinea({
      presupuesto_id: id,
      descripcion: descripcion.trim(),
      cantidad: Number(cantidad) || 1,
      precio_unitario_neto: Number(precio) || 0,
      orden: items.length,
    })
    setServicioId('')
    setDescripcion('')
    setCantidad('1')
    setPrecio('')
    setHoja(null)
    void lineas.recargar()
  }

  function abrirAjustes() {
    if (!p) return
    setEstado(p.estado)
    setDescuento(String(p.descuento_pct))
    setHoja('ajustes')
  }

  async function guardarAjustes() {
    await guardarPresupuesto(id, { estado, descuento_pct: Number(descuento) || 0 })
    setHoja(null)
    void recargar()
  }

  async function enviarPdf() {
    if (!p) return
    setGenerando(true)
    // El módulo del PDF arrastra jsPDF y las tipografías: se carga al pedirlo.
    const { generarPresupuestoPdf, compartirPdf } = await import('../lib/pdf')
    const blob = await generarPresupuestoPdf({
      presupuesto: p,
      lineas: items,
      cliente: cliente.datos,
      prospecto: prospecto.datos,
    })
    await compartirPdf(blob, `Presupuesto ${p.numero ?? ''} — Calor y Frío Industrial.pdf`)
    setGenerando(false)
  }

  function compartir() {
    const texto = [
      `*Calor y Frío Industrial* — Presupuesto ${p?.numero ?? ''}`,
      p?.titulo ?? '',
      '',
      ...items.map(
        l => `• ${l.descripcion} — ${l.cantidad} × ${clp(l.precio_unitario_neto)} = ${clp(l.cantidad * l.precio_unitario_neto)}`,
      ),
      '',
      ...(rebaja ? [`Descuento ${p?.descuento_pct}%: −${clp(rebaja)}`] : []),
      `Neto: ${clp(netoFinal)}`,
      `IVA: ${clp(total - netoFinal)}`,
      `*Total: ${clp(total)}*`,
      '',
      'Valores netos más IVA. Garantía de 30 días sobre la mano de obra.',
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const opcionesServicio: [string, string][] = [
    ['', 'Escribir a mano'],
    ...(servicios.datos ?? []).map(s => [s.id, `${CATEGORIAS[s.categoria]} · ${s.nombre}`] as [string, string]),
  ]

  return (
    <Pantalla
      titulo={p.titulo ?? 'Presupuesto'}
      bajada={`${p.numero ?? ''} · ${fechaCorta(p.fecha)}`}
      volver
      accion={<Boton onClick={abrirAjustes} className="min-h-9 px-3 text-sm">Ajustes</Boton>}
    >
      <Tarjeta>
        <Dato etiqueta="Estado">{ESTADOS_PRESUPUESTO[p.estado]}</Dato>
        <Dato etiqueta="Descuento">{p.descuento_pct}%</Dato>
        {tarifa.datos?.tarifario && <Dato etiqueta="Tarifario">{tarifa.datos.tarifario.nombre}</Dato>}
        <Dato etiqueta="Para">
          {cliente.datos?.nombre ?? prospecto.datos?.nombre ?? 'Sin cliente asignado'}
        </Dato>
      </Tarjeta>

      <section className="mt-4">
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          Líneas
          <Boton onClick={() => setHoja('linea')} className="min-h-9 px-3 text-sm">agregar</Boton>
        </h2>
        {items.length === 0 ? (
          <Vacio texto="Sin líneas. Se agregan desde el tarifario o a mano." />
        ) : (
          <ul className="space-y-2">
            {items.map(l => (
              <li key={l.id}>
                <Tarjeta className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm">{l.descripcion}</p>
                    <p className="text-xs text-mut">
                      {l.cantidad} × {clp(l.precio_unitario_neto)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm">{clp(l.cantidad * l.precio_unitario_neto)}</p>
                    <button onClick={() => setConfirmando(l)} className="text-xs text-faint active:text-rojo">
                      quitar
                    </button>
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Tarjeta className="mt-4">
        <div className="flex items-baseline justify-between py-1 text-sm">
          <span className="text-mut">Neto</span>
          <span className="font-mono">{clp(neto)}</span>
        </div>
        {rebaja > 0 && (
          <div className="flex items-baseline justify-between border-t border-linea py-1 text-sm">
            <span className="text-mut">Descuento {p.descuento_pct}%</span>
            <span className="font-mono">−{clp(rebaja)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-linea py-1 text-sm">
          <span className="text-mut">IVA 19%</span>
          <span className="font-mono">{clp(total - netoFinal)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-grafito pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="font-mono">{clp(total)}</span>
        </div>
      </Tarjeta>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Boton variante="acento" onClick={enviarPdf} disabled={generando || items.length === 0}>
          {generando ? 'Armando PDF…' : 'Enviar PDF'}
        </Boton>
        <Boton onClick={compartir}>Texto por WhatsApp</Boton>
      </div>
      <Boton variante="peligro" className="mt-2 w-full" onClick={() => setConfirmando('presupuesto')}>
        Borrar presupuesto
      </Boton>

      <Hoja abierta={hoja === 'linea'} titulo="Agregar línea" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Selector etiqueta="Del tarifario" opciones={opcionesServicio} value={servicioId} onChange={e => elegirServicio(e.target.value)} />
          <Campo etiqueta="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Cantidad" type="number" inputMode="decimal" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            <Campo etiqueta="Precio neto" type="number" inputMode="numeric" value={precio} onChange={e => setPrecio(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={agregarLinea}>Agregar</Boton>
          </div>
        </div>
      </Hoja>

      <Hoja abierta={hoja === 'ajustes'} titulo="Ajustes del presupuesto" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Selector
            etiqueta="Estado"
            opciones={Object.entries(ESTADOS_PRESUPUESTO)}
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoPresupuesto)}
          />
          <Campo
            etiqueta="Descuento (%)"
            type="number"
            inputMode="decimal"
            value={descuento}
            onChange={e => setDescuento(e.target.value)}
            pista={`Sobre ${clp(neto)} netos son ${clp(Math.round((neto * (Number(descuento) || 0)) / 100))}`}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarAjustes}>Guardar</Boton>
          </div>
        </div>
      </Hoja>

      <Confirmar
        abierta={confirmando !== null}
        titulo={confirmando === 'presupuesto' ? '¿Borrar el presupuesto?' : '¿Quitar la línea?'}
        detalle={
          confirmando === 'presupuesto'
            ? 'Se borra con todas sus líneas. No se puede deshacer.'
            : undefined
        }
        textoAceptar={confirmando === 'presupuesto' ? 'Borrar' : 'Quitar'}
        peligro
        alCerrar={() => setConfirmando(null)}
        alAceptar={async () => {
          if (confirmando === 'presupuesto') {
            await borrarPresupuesto(id)
            navegar('/presupuestos')
          } else if (confirmando) {
            await borrarLinea(confirmando.id)
            void lineas.recargar()
          }
        }}
      />
    </Pantalla>
  )
}
