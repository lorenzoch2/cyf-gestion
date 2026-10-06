import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boton, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio } from '../componentes/ui'
import { IconoFlecha } from '../componentes/iconos'
import {
  consultarOrdenes, consultarProveedores, crearOrden, siguienteNumeroOrden, useConsulta,
} from '../lib/datos'
import { fechaCorta } from '../lib/formato'
import { ESTADOS_ORDEN, type OrdenCompra, type Proveedor } from '../lib/tipos'

/*
  Las órdenes de compra que la empresa emite.

  No confundir con las que un cliente le emite a la empresa —como la de un cliente
  de mayo de 2026—: esas son venta y viven en el lado comercial.
*/
export function Compras() {
  const navegar = useNavigate()
  const [nueva, setNueva] = useState(false)
  const [proveedorId, setProveedorId] = useState('')

  const ordenes = useConsulta<OrdenCompra[]>(() => consultarOrdenes(), [])
  const proveedores = useConsulta<Proveedor[]>(() => consultarProveedores(true), [])

  const nombre = (id: string | null) =>
    proveedores.datos?.find(p => p.id === id)?.nombre ?? 'Sin proveedor'

  async function crear() {
    const numero = await siguienteNumeroOrden()
    const { data } = await crearOrden({
      numero,
      proveedor_id: proveedorId || null,
      estado: 'borrador',
    })
    setNueva(false)
    if (data) navegar(`/compras/${(data as OrdenCompra).id}`)
  }

  return (
    <Pantalla
      titulo="Compras"
      bajada={ordenes.cargando ? 'Cargando…' : `${(ordenes.datos ?? []).length} órdenes`}
      volver
      accion={
        <Boton variante="acento" className="min-h-9 px-3 text-sm" onClick={() => setNueva(true)}>
          Nueva
        </Boton>
      }
    >
      <Link to="/proveedores">
        <Tarjeta className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Proveedores</p>
            <p className="text-sm text-mut">A quién se le compra, y a cuántos días cotiza</p>
          </div>
          <span className="text-faint">
            <IconoFlecha />
          </span>
        </Tarjeta>
      </Link>

      {ordenes.cargando ? (
        <Cargando />
      ) : (ordenes.datos ?? []).length === 0 ? (
        <div className="mt-4">
          <Vacio texto="Todavía no hay órdenes de compra." />
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {(ordenes.datos ?? []).map(o => (
            <li key={o.id}>
              <Link to={`/compras/${o.id}`}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{nombre(o.proveedor_id)}</p>
                      <p className="font-mono text-xs text-faint">
                        OC {o.numero ?? '—'} · {fechaCorta(o.fecha)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-tinte px-1.5 py-0.5 text-[0.7rem] font-medium text-mut">
                      {ESTADOS_ORDEN[o.estado]}
                    </span>
                  </div>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Hoja abierta={nueva} titulo="Nueva orden de compra" alCerrar={() => setNueva(false)}>
        <div className="space-y-3">
          <Selector
            etiqueta="Proveedor"
            opciones={[
              ['', 'Elegir proveedor'],
              ...(proveedores.datos ?? []).map(p => [p.id, p.nombre] as [string, string]),
            ]}
            value={proveedorId}
            onChange={e => setProveedorId(e.target.value)}
          />
          <p className="text-xs text-faint">
            Una vez creada se le puede pedir que traiga sola lo que falta y este proveedor ya
            cotizó.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setNueva(false)}>Cancelar</Boton>
            <Boton variante="acento" onClick={() => void crear()}>
              Crear
            </Boton>
          </div>
        </div>
      </Hoja>
    </Pantalla>
  )
}
