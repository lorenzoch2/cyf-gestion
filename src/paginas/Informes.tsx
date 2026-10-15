import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boton, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio } from '../componentes/ui'
import {
  consultarClientes, consultarInformes, consultarMantenciones, consultarTecnicos, crearInforme,
  siguienteNumeroInforme, useConsulta,
} from '../lib/datos'
import { fechaCorta, hoyIso } from '../lib/formato'
import {
  TIPOS_INFORME,
  type Cliente, type Informe, type Mantencion, type Tecnico, type TipoInforme,
} from '../lib/tipos'

/*
  Los informes de cierre.

  Es lo que el sitio promete cuando dice «trabajo medido y documentado». Se
  arma en terreno, con el trabajo todavía fresco, y se entrega antes de irse
  del local.
*/
export function Informes() {
  const navegar = useNavigate()
  const [nuevo, setNuevo] = useState(false)

  const informes = useConsulta<Informe[]>(() => consultarInformes(), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])
  const tecnicos = useConsulta<Tecnico[]>(() => consultarTecnicos(true), [])
  const mantenciones = useConsulta<Mantencion[]>(() => consultarMantenciones(true), [])

  const nombre = (id: string | null) =>
    clientes.datos?.find(c => c.id === id)?.nombre ?? 'Sin cliente'

  return (
    <Pantalla
      titulo="Informes"
      bajada={
        informes.cargando ? 'Cargando…' : `${(informes.datos ?? []).length} emitidos y en borrador`
      }
      volver
      accion={
        <Boton variante="acento" className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Nuevo
        </Boton>
      }
    >
      {informes.cargando ? (
        <Cargando />
      ) : (informes.datos ?? []).length === 0 ? (
        <Vacio texto="Todavía no hay informes. Uno por visita: deja por escrito lo que se hizo y se entrega firmado antes de salir del local." />
      ) : (
        <ul className="space-y-2">
          {(informes.datos ?? []).map(i => (
            <li key={i.id}>
              <Link to={`/informes/${i.id}`}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{nombre(i.cliente_id)}</p>
                      <p className="truncate text-sm text-mut">{TIPOS_INFORME[i.tipo]}</p>
                      <p className="mt-0.5 font-mono text-xs text-faint">
                        IC {i.numero ?? '—'} · {fechaCorta(i.fecha)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${
                        i.estado === 'emitido' ? 'bg-verde/12 text-verde' : 'bg-tinte text-mut'
                      }`}
                    >
                      {i.estado === 'emitido' ? 'Emitido' : 'Borrador'}
                    </span>
                  </div>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <HojaNuevo
        abierta={nuevo}
        clientes={clientes.datos ?? []}
        tecnicos={tecnicos.datos ?? []}
        mantenciones={mantenciones.datos ?? []}
        alCerrar={() => setNuevo(false)}
        alCreado={id => navegar(`/informes/${id}`)}
      />
    </Pantalla>
  )
}

function HojaNuevo({
  abierta,
  clientes,
  tecnicos,
  mantenciones,
  alCerrar,
  alCreado,
}: {
  abierta: boolean
  clientes: Cliente[]
  tecnicos: Tecnico[]
  mantenciones: Mantencion[]
  alCerrar: () => void
  alCreado: (id: string) => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState<TipoInforme>('preventiva')
  const [tecnicoId, setTecnicoId] = useState('')
  const [mantencionId, setMantencionId] = useState('')

  // Las mantenciones del cliente elegido: cerrar una desde aquí es lo que
  // enlaza el programa con el papel que recibe el cliente.
  const suyas = mantenciones.filter(m => m.cliente_id === clienteId)

  async function crear() {
    if (!clienteId) return
    const numero = await siguienteNumeroInforme()
    const { data } = await crearInforme({
      numero,
      cliente_id: clienteId,
      tipo,
      tecnico_id: tecnicoId || null,
      mantencion_id: mantencionId || null,
      fecha: hoyIso(),
      estado: 'borrador',
    })
    alCerrar()
    if (data) alCreado((data as Informe).id)
  }

  return (
    <Hoja abierta={abierta} titulo="Nuevo informe" alCerrar={alCerrar}>
      <div className="space-y-3">
        <Selector
          etiqueta="Cliente"
          opciones={[
            ['', 'Elegir cliente'],
            ...clientes.map(c => [c.id, c.nombre] as [string, string]),
          ]}
          value={clienteId}
          onChange={e => {
            setClienteId(e.target.value)
            setMantencionId('')
          }}
        />
        <Selector
          etiqueta="Tipo de trabajo"
          opciones={Object.entries(TIPOS_INFORME)}
          value={tipo}
          onChange={e => setTipo(e.target.value as TipoInforme)}
        />
        {suyas.length > 0 && (
          <Selector
            etiqueta="¿Cierra una mantención programada?"
            opciones={[
              ['', 'No'],
              ...suyas.map(
                m => [m.id, `${fechaCorta(m.programada_el)} · ${m.titulo ?? 'Preventiva'}`] as [string, string],
              ),
            ]}
            value={mantencionId}
            onChange={e => setMantencionId(e.target.value)}
          />
        )}
        <Selector
          etiqueta="Quién lo hizo"
          opciones={[['', 'Sin asignar'], ...tecnicos.map(t => [t.id, t.nombre] as [string, string])]}
          value={tecnicoId}
          onChange={e => setTecnicoId(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void crear()}>
            Crear
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}
