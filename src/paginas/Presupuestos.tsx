import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boton, Campo, Cargando, Etiqueta, Hoja, Pantalla, Selector, Tarjeta, Vacio } from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import {
  consultarClientes, consultarPresupuestos, crearPresupuesto, siguienteNumero, useConsulta,
} from '../lib/datos'
import { fechaCorta } from '../lib/formato'
import { ESTADOS_PRESUPUESTO, type Cliente, type Presupuesto } from '../lib/tipos'

export function Presupuestos() {
  const navegar = useNavigate()
  const { datos, cargando, recargar } = useConsulta<Presupuesto[]>(() => consultarPresupuestos(), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])
  const [abierta, setAbierta] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')

  async function crear() {
    const numero = await siguienteNumero()
    const { data } = await crearPresupuesto({
      numero,
      titulo: titulo.trim() || 'Mantención',
      cliente_id: clienteId || null,
    })
    setTitulo('')
    setAbierta(false)
    void recargar()
    if (data) navegar(`/presupuestos/${data.id}`)
  }

  const lista = datos ?? []

  return (
    <Pantalla
      titulo="Presupuestos"
      volver
      accion={
        <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Nuevo presupuesto">
          <IconoAgregar />
        </Boton>
      }
    >
      {cargando ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio texto="Sin presupuestos todavía." />
      ) : (
        <ul className="space-y-2">
          {lista.map(p => (
            <li key={p.id}>
              <Link to={`/presupuestos/${p.id}`}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.titulo ?? 'Presupuesto'}</p>
                      <p className="font-mono text-xs text-faint">{p.numero}</p>
                    </div>
                    <Etiqueta
                      tono={
                        p.estado === 'aceptado' ? 'verde' : p.estado === 'rechazado' ? 'mut' : p.estado === 'enviado' ? 'acero' : 'laton'
                      }
                    >
                      {ESTADOS_PRESUPUESTO[p.estado]}
                    </Etiqueta>
                  </div>
                  <p className="mt-1 text-xs text-mut">{fechaCorta(p.fecha)}</p>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Hoja abierta={abierta} titulo="Nuevo presupuesto" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Campo
            etiqueta="Título"
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Mantención trimestral"
          />
          <Selector
            etiqueta="Cliente"
            opciones={[['', 'Sin cliente'], ...(clientes.datos ?? []).map(c => [c.id, c.nombre] as [string, string])]}
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
          />
          <Boton variante="acento" className="w-full" onClick={crear}>
            Crear y agregar líneas
          </Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
