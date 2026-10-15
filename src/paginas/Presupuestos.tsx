import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBorrador } from '../lib/borrador'
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

  /*
    Cada presupuesto se lleva un número correlativo, y los correlativos no se
    reciclan: uno creado por equivocación deja un hueco en la numeración que el
    cliente después ve. Por eso exige título —no se crea «Mantención» por
    omisión— y lo escrito queda en borrador hasta que se confirma.
  */
  const nuevo = useBorrador('presupuesto-nuevo', { titulo: '', clienteId: '' })

  async function crear() {
    if (!nuevo.valor.titulo.trim()) return
    const numero = await siguienteNumero()
    const { data } = await crearPresupuesto({
      numero,
      titulo: nuevo.valor.titulo.trim(),
      cliente_id: nuevo.valor.clienteId || null,
    })
    nuevo.olvidar()
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
        <Vacio texto="Sin presupuestos todavía. El que se manda el mismo día de la visita vale el doble." />
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
          {nuevo.recuperado && (
            <p className="rounded-lg bg-tinte px-3 py-2 text-xs text-mut">
              Recuperado lo que habías escrito antes. Todavía no está creado.
            </p>
          )}
          <Campo
            etiqueta="Título"
            autoFocus
            value={nuevo.valor.titulo}
            onChange={e => nuevo.fijar({ titulo: e.target.value })}
            placeholder="Mantención trimestral"
            pista="Hace falta: cada presupuesto se lleva un número correlativo."
          />
          <Selector
            etiqueta="Cliente"
            opciones={[['', 'Sin cliente'], ...(clientes.datos ?? []).map(c => [c.id, c.nombre] as [string, string])]}
            value={nuevo.valor.clienteId}
            onChange={e => nuevo.fijar({ clienteId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Boton onClick={() => setAbierta(false)}>Después</Boton>
            <Boton variante="acento" onClick={crear}>Crear</Boton>
          </div>
          <button
            onClick={() => {
              nuevo.olvidar()
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
