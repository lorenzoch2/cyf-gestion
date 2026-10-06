import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Confirmar, Dato, Hoja, Pantalla, Tarjeta,
} from '../componentes/ui'
import {
  agregarFaltantesDeProveedor, borrarLineaOrden, borrarOrden, consultarLineasOrden,
  consultarOrden, consultarProveedores, crearLineaOrden, guardarOrden, recibirOrden, useConsulta,
} from '../lib/datos'
import { clp, conIva, fechaCorta, IVA } from '../lib/formato'
import {
  ESTADOS_ORDEN, type LineaOrden, type OrdenCompra, type Proveedor,
} from '../lib/tipos'

export function CompraDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const [agregando, setAgregando] = useState(false)
  const [confirmando, setConfirmando] = useState<'recibir' | 'borrar' | null>(null)
  const [aviso, setAviso] = useState('')

  const orden = useConsulta<OrdenCompra>(() => consultarOrden(id), [id])
  const lineas = useConsulta<LineaOrden[]>(() => consultarLineasOrden(id), [id])
  const proveedores = useConsulta<Proveedor[]>(() => consultarProveedores(), [])

  const o = orden.datos
  const proveedor = proveedores.datos?.find(p => p.id === o?.proveedor_id) ?? null
  const neto = (lineas.datos ?? []).reduce((s, l) => s + l.cantidad * l.precio_neto, 0)

  async function traerFaltantes() {
    if (!o?.proveedor_id) return
    const cuantas = await agregarFaltantesDeProveedor(o.id, o.proveedor_id)
    setAviso(
      cuantas === 0
        ? 'No hay nada que falte con precio de este proveedor.'
        : cuantas === 1
          ? 'Se agregó una línea.'
          : `Se agregaron ${cuantas} líneas.`,
    )
    void lineas.recargar()
  }

  async function cambiarEstado(estado: OrdenCompra['estado']) {
    await guardarOrden(id, { estado })
    void orden.recargar()
  }

  if (orden.cargando) return <Cargando />
  if (!o) return <Pantalla titulo="Orden" volver>No se encontró la orden.</Pantalla>

  return (
    <Pantalla
      titulo={proveedor?.nombre ?? 'Orden de compra'}
      bajada={`OC ${o.numero ?? '—'} · ${fechaCorta(o.fecha)} · ${ESTADOS_ORDEN[o.estado]}`}
      volver
    >
      <div className="space-y-4">
        {proveedor && (
          <Tarjeta className="space-y-1 p-3">
            {proveedor.rut && <Dato etiqueta="R.U.T.">{proveedor.rut}</Dato>}
            {proveedor.condiciones && (
              <Dato etiqueta="Condiciones">{proveedor.condiciones}</Dato>
            )}
            {proveedor.validez_dias !== null && (
              <Dato etiqueta="Validez de sus precios">{proveedor.validez_dias} días corridos</Dato>
            )}
          </Tarjeta>
        )}

        {o.estado === 'borrador' && (
          <div className="grid grid-cols-2 gap-2">
            <Boton onClick={() => void traerFaltantes()}>Traer lo que falta</Boton>
            <Boton onClick={() => setAgregando(true)}>Agregar línea</Boton>
          </div>
        )}
        {aviso && <p className="text-sm text-mut">{aviso}</p>}

        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">Líneas</h2>
          {(lineas.datos ?? []).length === 0 ? (
            <p className="text-sm text-mut">
              Sin líneas todavía. «Traer lo que falta» las saca de las cotizaciones de este
              proveedor.
            </p>
          ) : (
            <ul className="space-y-2">
              {(lineas.datos ?? []).map(l => (
                <li key={l.id}>
                  <Tarjeta className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{l.descripcion}</p>
                        <p className="font-mono text-xs text-faint">
                          {l.cantidad} × {clp(l.precio_neto)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm">{clp(l.cantidad * l.precio_neto)}</p>
                        {o.estado === 'borrador' && (
                          <button
                            onClick={async () => {
                              await borrarLineaOrden(l.id)
                              void lineas.recargar()
                            }}
                            className="text-xs text-faint"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  </Tarjeta>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Tarjeta className="space-y-1 p-3">
          <Dato etiqueta="Neto">{clp(neto)}</Dato>
          <Dato etiqueta={`IVA ${Math.round(IVA * 100)}%`}>{clp(Math.round(neto * IVA))}</Dato>
          <Dato etiqueta="Total">
            <span className="font-semibold">{clp(conIva(neto))}</span>
          </Dato>
        </Tarjeta>

        <div className="space-y-2">
          {o.estado === 'borrador' && (
            <Boton variante="acento" className="w-full" onClick={() => void cambiarEstado('enviada')}>
              Marcar como enviada
            </Boton>
          )}
          {o.estado === 'enviada' && (
            <Boton
              variante="acento"
              className="w-full"
              onClick={() => setConfirmando('recibir')}
            >
              Recibir
            </Boton>
          )}
          {o.estado !== 'anulada' && o.estado !== 'recibida' && (
            <Boton className="w-full" onClick={() => void cambiarEstado('anulada')}>
              Anular
            </Boton>
          )}
          <Boton variante="peligro" className="w-full" onClick={() => setConfirmando('borrar')}>
            Borrar orden
          </Boton>
        </div>
      </div>

      <Hoja abierta={agregando} titulo="Agregar línea" alCerrar={() => setAgregando(false)}>
        <FormularioLinea
          ordenId={id}
          alGuardar={() => {
            setAgregando(false)
            void lineas.recargar()
          }}
        />
      </Hoja>

      <Confirmar
        abierta={confirmando === 'recibir'}
        titulo="Recibir la orden"
        detalle="Todo lo que trae esta orden va a quedar como «lo tenemos» en el inventario."
        textoAceptar="Recibir"
        alAceptar={() => {
          void recibirOrden(id).then(() => {
            void orden.recargar()
            void lineas.recargar()
          })
        }}
        alCerrar={() => setConfirmando(null)}
      />

      <Confirmar
        abierta={confirmando === 'borrar'}
        titulo="Borrar la orden"
        detalle="Se borra la orden y sus líneas. No se puede deshacer."
        textoAceptar="Borrar"
        peligro
        alAceptar={() => {
          void borrarOrden(id).then(() => navegar('/compras'))
        }}
        alCerrar={() => setConfirmando(null)}
      />
    </Pantalla>
  )
}

function FormularioLinea({
  ordenId,
  alGuardar,
}: {
  ordenId: string
  alGuardar: () => void
}) {
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')

  async function guardar() {
    if (!descripcion.trim()) return
    await crearLineaOrden({
      orden_id: ordenId,
      descripcion: descripcion.trim(),
      cantidad: Number(cantidad) || 1,
      precio_neto: Math.round(Number(precio) || 0),
      orden: 999,
    })
    alGuardar()
  }

  return (
    <div className="space-y-3">
      <Area
        etiqueta="Qué se pide"
        autoFocus
        rows={2}
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Campo
          etiqueta="Cantidad"
          type="number"
          inputMode="decimal"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
        />
        <Campo
          etiqueta="Precio neto"
          type="number"
          inputMode="numeric"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
        />
      </div>
      <Boton variante="acento" className="w-full" onClick={() => void guardar()}>
        Agregar
      </Boton>
    </div>
  )
}
