import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Boton, Campo, Cargando, Error, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  borrarLinea, borrarPresupuesto, consultarLineas, consultarPresupuesto, consultarServicios,
  crearLinea, guardarPresupuesto, useConsulta,
} from '../lib/datos'
import { clp, conIva, fechaCorta } from '../lib/formato'
import {
  CATEGORIAS, ESTADOS_PRESUPUESTO,
  type EstadoPresupuesto, type LineaPresupuesto, type Presupuesto, type Servicio,
} from '../lib/tipos'

export function PresupuestoDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { datos: p, cargando, error, recargar } = useConsulta<Presupuesto>(() => consultarPresupuesto(id), [id])
  const lineas = useConsulta<LineaPresupuesto[]>(() => consultarLineas(id), [id])
  const servicios = useConsulta<Servicio[]>(() => consultarServicios(), [])

  const [abierta, setAbierta] = useState(false)
  const [servicioId, setServicioId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')

  if (cargando) return <Cargando />
  if (error || !p) return <Pantalla titulo="Presupuesto" volver><Error mensaje={error ?? 'No se encontró'} /></Pantalla>

  const items = lineas.datos ?? []
  const neto = items.reduce((t, l) => t + l.cantidad * l.precio_unitario_neto, 0)
  const descuento = Math.round((neto * Number(p.descuento_pct)) / 100)
  const netoFinal = neto - descuento
  const total = conIva(netoFinal)

  function elegirServicio(valor: string) {
    setServicioId(valor)
    const s = (servicios.datos ?? []).find(x => x.id === valor)
    if (s) {
      setDescripcion(s.nombre)
      setPrecio(String(s.precio_neto))
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
    setAbierta(false)
    void lineas.recargar()
  }

  async function cambiarEstado(estado: EstadoPresupuesto) {
    await guardarPresupuesto(id, { estado })
    void recargar()
  }

  function compartir() {
    const texto = [
      `*Calor y Frío Industrial* — Presupuesto ${p?.numero ?? ''}`,
      p?.titulo ?? '',
      '',
      ...items.map(l => `• ${l.descripcion} — ${l.cantidad} × ${clp(l.precio_unitario_neto)} = ${clp(l.cantidad * l.precio_unitario_neto)}`),
      '',
      `Neto: ${clp(netoFinal)}`,
      `IVA: ${clp(total - netoFinal)}`,
      `*Total: ${clp(total)}*`,
      '',
      'Valores netos más IVA. Garantía de 30 días sobre la mano de obra.',
    ].join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const opcionesServicio: [string, string][] = [
    ['', 'Escribir a mano'],
    ...(servicios.datos ?? []).map(s => [s.id, `${CATEGORIAS[s.categoria]} · ${s.nombre}`] as [string, string]),
  ]

  return (
    <Pantalla titulo={p.titulo ?? 'Presupuesto'} bajada={`${p.numero ?? ''} · ${fechaCorta(p.fecha)}`} volver>
      <Selector
        etiqueta="Estado"
        opciones={Object.entries(ESTADOS_PRESUPUESTO)}
        value={p.estado}
        onChange={e => cambiarEstado(e.target.value as EstadoPresupuesto)}
      />

      <section className="mt-4">
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          Líneas
          <Boton onClick={() => setAbierta(true)} className="min-h-9 px-3 text-sm">agregar</Boton>
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
                    <button
                      onClick={async () => {
                        await borrarLinea(l.id)
                        void lineas.recargar()
                      }}
                      className="text-xs text-faint active:text-rojo"
                    >
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
        <div className="flex items-center justify-between gap-3 border-t border-linea py-2 text-sm">
          <span className="text-mut">Descuento</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={p.descuento_pct}
              onChange={async e => {
                await guardarPresupuesto(id, { descuento_pct: Number(e.target.value) || 0 })
                void recargar()
              }}
              className="w-16 rounded border border-linea-2 px-2 py-1 text-right"
            />
            <span className="text-mut">%</span>
            <span className="font-mono w-20 text-right">−{clp(descuento)}</span>
          </div>
        </div>
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
        <Boton variante="acento" onClick={compartir}>Compartir</Boton>
        <Boton
          variante="peligro"
          onClick={async () => {
            await borrarPresupuesto(id)
            navegar('/presupuestos')
          }}
        >
          Borrar
        </Boton>
      </div>

      <Hoja abierta={abierta} titulo="Agregar línea" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Selector etiqueta="Del tarifario" opciones={opcionesServicio} value={servicioId} onChange={e => elegirServicio(e.target.value)} />
          <Campo etiqueta="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Cantidad" type="number" inputMode="decimal" value={cantidad} onChange={e => setCantidad(e.target.value)} />
            <Campo etiqueta="Precio neto" type="number" inputMode="numeric" value={precio} onChange={e => setPrecio(e.target.value)} />
          </div>
          <Boton variante="acento" className="w-full" onClick={agregarLinea}>Agregar</Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
