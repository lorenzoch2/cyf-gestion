import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  cerrarMantencion, consultarClientes, consultarEquipos, consultarMantenciones,
  consultarTecnicos, crearMantencion, guardarMantencion, useConsulta,
} from '../lib/datos'
import { diasHasta, fechaCorta, hoyIso, plural } from '../lib/formato'
import {
  FRECUENCIAS, type Cliente, type Equipo, type Mantencion, type Tecnico,
} from '../lib/tipos'

/*
  Las mantenciones programadas.

  Es lo contrario de la bitácora de visitas: no lo que pasó, sino lo que hay
  que ir a hacer. La pantalla ordena por urgencia porque esa es la única
  pregunta real del lunes en la mañana: qué está atrasado y qué viene esta
  semana.
*/

type Tramo = 'atrasadas' | 'semana' | 'mes' | 'despues'

const TRAMOS: Record<Tramo, { titulo: string; tono: string }> = {
  atrasadas: { titulo: 'Atrasadas', tono: 'text-rojo' },
  semana: { titulo: 'Esta semana', tono: 'text-laton-dk' },
  mes: { titulo: 'Este mes', tono: 'text-mut' },
  despues: { titulo: 'Más adelante', tono: 'text-faint' },
}

function tramoDe(fecha: string): Tramo {
  const dias = diasHasta(fecha) ?? 0
  if (dias < 0) return 'atrasadas'
  if (dias <= 7) return 'semana'
  if (dias <= 31) return 'mes'
  return 'despues'
}

export function Mantenciones() {
  const [abierta, setAbierta] = useState<Mantencion | null>(null)
  const [nueva, setNueva] = useState(false)

  const mantenciones = useConsulta<Mantencion[]>(() => consultarMantenciones(true), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])
  const tecnicos = useConsulta<Tecnico[]>(() => consultarTecnicos(true), [])

  const nombreCliente = (id: string) =>
    clientes.datos?.find(c => c.id === id)?.nombre ?? 'Cliente'

  const porTramo = useMemo(() => {
    const grupos = new Map<Tramo, Mantencion[]>()
    for (const m of mantenciones.datos ?? []) {
      const t = tramoDe(m.programada_el)
      const g = grupos.get(t)
      if (g) g.push(m)
      else grupos.set(t, [m])
    }
    return (['atrasadas', 'semana', 'mes', 'despues'] as Tramo[])
      .map(t => [t, grupos.get(t) ?? []] as const)
      .filter(([, lista]) => lista.length > 0)
  }, [mantenciones.datos])

  const atrasadas = (mantenciones.datos ?? []).filter(m => (diasHasta(m.programada_el) ?? 0) < 0)

  function recargar() {
    void mantenciones.recargar()
  }

  return (
    <Pantalla
      titulo="Mantenciones"
      bajada={
        mantenciones.cargando
          ? 'Cargando…'
          : plural((mantenciones.datos ?? []).length, 'programada', 'programadas') +
            (atrasadas.length ? ` · ${atrasadas.length} atrasadas` : '')
      }
      volver
      accion={
        <Boton variante="acento" className="min-h-9 px-3 text-sm" onClick={() => setNueva(true)}>
          Programar
        </Boton>
      }
    >
      {mantenciones.cargando ? (
        <Cargando />
      ) : (mantenciones.datos ?? []).length === 0 ? (
        <Vacio texto="No hay mantenciones programadas." />
      ) : (
        <div className="space-y-5">
          {porTramo.map(([tramo, lista]) => (
            <section key={tramo}>
              <h2
                className={`mb-2 font-mono text-xs uppercase tracking-wider ${TRAMOS[tramo].tono}`}
              >
                {TRAMOS[tramo].titulo} · {lista.length}
              </h2>
              <ul className="space-y-2">
                {lista.map(m => {
                  const dias = diasHasta(m.programada_el) ?? 0
                  const tecnico = tecnicos.datos?.find(t => t.id === m.tecnico_id)
                  return (
                    <li key={m.id}>
                      <button onClick={() => setAbierta(m)} className="block w-full text-left">
                        <Tarjeta className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{nombreCliente(m.cliente_id)}</p>
                              <p className="truncate text-sm text-mut">
                                {m.titulo ?? 'Mantención preventiva'}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-xs ${
                                dias < 0 ? 'text-rojo' : 'text-faint'
                              }`}
                            >
                              {fechaCorta(m.programada_el)}
                            </span>
                          </div>
                          <p className="mt-1.5 flex gap-3 font-mono text-xs text-faint">
                            <span>
                              {dias < 0
                                ? `atrasada ${-dias} d`
                                : dias === 0
                                  ? 'hoy'
                                  : `en ${dias} d`}
                            </span>
                            {tecnico && <span>{tecnico.nombre.split(' ')[0]}</span>}
                            {m.frecuencia_meses && <span>cada {m.frecuencia_meses} m</span>}
                          </p>
                        </Tarjeta>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {abierta && (
        <HojaMantencion
          mantencion={abierta}
          cliente={nombreCliente(abierta.cliente_id)}
          tecnicos={tecnicos.datos ?? []}
          alCerrar={() => setAbierta(null)}
          alGuardar={recargar}
        />
      )}

      <HojaProgramar
        abierta={nueva}
        clientes={clientes.datos ?? []}
        tecnicos={tecnicos.datos ?? []}
        alCerrar={() => setNueva(false)}
        alGuardar={recargar}
      />
    </Pantalla>
  )
}

/* ── Cerrar, reprogramar o asignar ──────────────────────────────────────── */

function HojaMantencion({
  mantencion,
  cliente,
  tecnicos,
  alCerrar,
  alGuardar,
}: {
  mantencion: Mantencion
  cliente: string
  tecnicos: Tecnico[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [fecha, setFecha] = useState(mantencion.programada_el)
  const [tecnicoId, setTecnicoId] = useState(mantencion.tecnico_id ?? '')
  const [nota, setNota] = useState(mantencion.nota ?? '')
  const [siguiente, setSiguiente] = useState<string | null>(null)

  async function cerrar() {
    const creada = await cerrarMantencion(mantencion, hoyIso(), nota)
    alGuardar()
    if (creada) setSiguiente(creada.programada_el)
    else alCerrar()
  }

  async function guardar() {
    await guardarMantencion(mantencion.id, {
      programada_el: fecha,
      tecnico_id: tecnicoId || null,
      nota: nota.trim() || null,
      estado: fecha !== mantencion.programada_el ? 'programada' : mantencion.estado,
    })
    alGuardar()
    alCerrar()
  }

  async function anular() {
    await guardarMantencion(mantencion.id, { estado: 'anulada' })
    alGuardar()
    alCerrar()
  }

  if (siguiente) {
    return (
      <Hoja abierta titulo="Hecha" alCerrar={alCerrar}>
        <div className="space-y-3">
          <p className="text-sm">
            Quedó cerrada y la siguiente ya está agendada para el{' '}
            <strong>{fechaCorta(siguiente)}</strong>.
          </p>
          <p className="text-sm text-mut">
            Si la próxima no queda agendada al cerrar la anterior, no la agenda nadie.
          </p>
          <Boton variante="acento" className="w-full" onClick={alCerrar}>
            Listo
          </Boton>
        </div>
      </Hoja>
    )
  }

  return (
    <Hoja abierta titulo={cliente} alCerrar={alCerrar}>
      <div className="space-y-3">
        <p className="text-sm text-mut">{mantencion.titulo ?? 'Mantención preventiva'}</p>

        <Boton variante="acento" className="w-full" onClick={() => void cerrar()}>
          Marcar como hecha hoy
        </Boton>

        <Campo
          etiqueta="Reprogramar para"
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
        />
        <Selector
          etiqueta="Quién va"
          opciones={[['', 'Sin asignar'], ...tecnicos.map(t => [t.id, t.nombre] as [string, string])]}
          value={tecnicoId}
          onChange={e => setTecnicoId(e.target.value)}
        />
        <Area etiqueta="Nota" value={nota} onChange={e => setNota(e.target.value)} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={() => void anular()}>Anular</Boton>
          <Boton onClick={() => void guardar()}>Guardar</Boton>
        </div>

        <Link to={`/clientes/${mantencion.cliente_id}`} className="block pt-1 text-sm font-medium text-acero-dk">
          Ver la ficha del cliente
        </Link>
      </div>
    </Hoja>
  )
}

/* ── Programar una nueva ────────────────────────────────────────────────── */

function HojaProgramar({
  abierta,
  clientes,
  tecnicos,
  alCerrar,
  alGuardar,
}: {
  abierta: boolean
  clientes: Cliente[]
  tecnicos: Tecnico[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(hoyIso())
  const [frecuencia, setFrecuencia] = useState('6')
  const [tecnicoId, setTecnicoId] = useState('')

  const equipos = useConsulta<Equipo[]>(
    () => consultarEquipos(clienteId),
    [clienteId],
  )

  async function guardar() {
    if (!clienteId) return
    await crearMantencion({
      cliente_id: clienteId,
      equipo_id: equipoId || null,
      tecnico_id: tecnicoId || null,
      programada_el: fecha,
      frecuencia_meses: frecuencia ? Number(frecuencia) : null,
      titulo: titulo.trim() || null,
      estado: 'programada',
    })
    setTitulo('')
    setEquipoId('')
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja abierta={abierta} titulo="Programar mantención" alCerrar={alCerrar}>
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
            setEquipoId('')
          }}
        />

        {clienteId && (
          <Selector
            etiqueta="Equipo"
            opciones={[
              ['', 'Todo el local'],
              ...(equipos.datos ?? []).map(
                eq => [eq.id, `${eq.tipo}${eq.ubicacion ? ' · ' + eq.ubicacion : ''}`] as [string, string],
              ),
            ]}
            value={equipoId}
            onChange={e => setEquipoId(e.target.value)}
          />
        )}

        <Campo
          etiqueta="Qué se va a hacer"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Mantención preventiva"
        />
        <Campo
          etiqueta="Fecha"
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
        />
        <Selector
          etiqueta="Cada cuánto se repite"
          opciones={FRECUENCIAS}
          value={frecuencia}
          onChange={e => setFrecuencia(e.target.value)}
          className="mb-0"
        />
        <p className="text-xs text-faint">
          Al cerrar una mantención, la siguiente se agenda sola con esta frecuencia.
        </p>
        <Selector
          etiqueta="Quién va"
          opciones={[['', 'Sin asignar'], ...tecnicos.map(t => [t.id, t.nombre] as [string, string])]}
          value={tecnicoId}
          onChange={e => setTecnicoId(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Programar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}
