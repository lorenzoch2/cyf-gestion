import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Dato, Error, Etiqueta, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoPin, IconoTelefono, IconoWhatsapp } from '../componentes/iconos'
import {
  borrarEquipo, consultarCliente, consultarContratos, consultarEquipos, consultarVisitas,
  crearContrato, crearEquipo, crearVisita, useConsulta,
} from '../lib/datos'
import { clp, enlaceLlamada, enlaceMapa, enlaceWhatsapp, fechaCorta, hoyIso } from '../lib/formato'
import {
  PLANES, TIPOS_EQUIPO, TIPOS_VISITA,
  type Cliente, type Contrato, type Equipo, type PlanContrato, type TipoVisita, type Visita,
} from '../lib/tipos'

export function ClienteDetalle() {
  const { id = '' } = useParams()
  const { datos: c, cargando, error } = useConsulta<Cliente>(() => consultarCliente(id), [id])
  const equipos = useConsulta<Equipo[]>(() => consultarEquipos(id), [id])
  const contratos = useConsulta<Contrato[]>(() => consultarContratos(id), [id])
  const visitas = useConsulta<Visita[]>(() => consultarVisitas({ clienteId: id }), [id])

  const [hoja, setHoja] = useState<'equipo' | 'contrato' | 'visita' | null>(null)

  // equipo
  const [tipo, setTipo] = useState('split_muro')
  const [capacidad, setCapacidad] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  // contrato
  const [plan, setPlan] = useState<PlanContrato>('trimestral')
  const [valorVisita, setValorVisita] = useState('')
  // visita
  const [tipoVisita, setTipoVisita] = useState<TipoVisita>('mantencion')
  const [resumen, setResumen] = useState('')

  if (cargando) return <Cargando />
  if (error || !c) return <Pantalla titulo="Cliente" volver><Error mensaje={error ?? 'No se encontró'} /></Pantalla>

  async function guardarEquipo() {
    await crearEquipo({ cliente_id: id, tipo, capacidad: capacidad || null, ubicacion: ubicacion || null })
    setCapacidad('')
    setUbicacion('')
    setHoja(null)
    void equipos.recargar()
  }

  async function guardarContrato() {
    const visitasAlAnio = plan === 'trimestral' ? 4 : plan === 'semestral' ? 2 : plan === 'anual' ? 1 : 0
    const valor = Number(valorVisita) || 0
    await crearContrato({
      cliente_id: id,
      plan,
      visitas_al_anio: visitasAlAnio,
      valor_visita_neto: valor || null,
      valor_mensual_neto: valor && visitasAlAnio ? Math.round((valor * visitasAlAnio) / 12) : null,
      inicio: hoyIso(),
    })
    setValorVisita('')
    setHoja(null)
    void contratos.recargar()
  }

  async function guardarVisita() {
    await crearVisita({ cliente_id: id, tipo: tipoVisita, fecha: hoyIso(), resumen: resumen || null })
    setResumen('')
    setHoja(null)
    void visitas.recargar()
  }

  const tel = enlaceLlamada(c.telefono)
  const wsp = enlaceWhatsapp(c.telefono)
  const mapa = enlaceMapa(c.lat, c.lng, c.direccion)

  return (
    <Pantalla titulo={c.nombre} bajada={[c.direccion, c.comuna].filter(Boolean).join(', ') || undefined} volver>
      <div className="grid grid-cols-3 gap-2">
        <a href={tel ?? undefined} className={!tel ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoTelefono /></span>Llamar
          </Tarjeta>
        </a>
        <a href={wsp ?? undefined} target="_blank" rel="noreferrer" className={!wsp ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoWhatsapp /></span>WhatsApp
          </Tarjeta>
        </a>
        <a href={mapa ?? undefined} target="_blank" rel="noreferrer" className={!mapa ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoPin /></span>Mapa
          </Tarjeta>
        </a>
      </div>

      <Tarjeta className="mt-4">
        <Dato etiqueta="R.U.T.">{c.rut ?? '—'}</Dato>
        <Dato etiqueta="Contacto">{[c.contacto_nombre, c.contacto_cargo].filter(Boolean).join(' · ') || '—'}</Dato>
        <Dato etiqueta="Teléfono">{c.telefono ?? '—'}</Dato>
        <Dato etiqueta="Correo">{c.email ?? '—'}</Dato>
      </Tarjeta>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          Equipos
          <Boton onClick={() => setHoja('equipo')} className="min-h-9 px-3 text-sm">agregar</Boton>
        </h2>
        {(equipos.datos ?? []).length === 0 ? (
          <Vacio texto="Sin equipos cargados." />
        ) : (
          <ul className="space-y-2">
            {(equipos.datos ?? []).map(e => (
              <li key={e.id}>
                <Tarjeta className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{TIPOS_EQUIPO[e.tipo] ?? e.tipo}</p>
                    <p className="truncate text-xs text-mut">
                      {[e.capacidad, e.ubicacion].filter(Boolean).join(' · ') || 'Sin detalle'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await borrarEquipo(e.id)
                      void equipos.recargar()
                    }}
                    className="shrink-0 text-xs text-faint active:text-rojo"
                  >
                    quitar
                  </button>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          Contratos
          <Boton onClick={() => setHoja('contrato')} className="min-h-9 px-3 text-sm">agregar</Boton>
        </h2>
        {(contratos.datos ?? []).length === 0 ? (
          <Vacio texto="Sin contrato de mantención." />
        ) : (
          <ul className="space-y-2">
            {(contratos.datos ?? []).map(k => (
              <li key={k.id}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{PLANES[k.plan]}</p>
                      <p className="text-xs text-mut">
                        {clp(k.valor_visita_neto)} por visita · {clp(k.valor_mensual_neto)} al mes
                      </p>
                    </div>
                    <Etiqueta tono={k.estado === 'activo' ? 'verde' : 'mut'}>{k.estado}</Etiqueta>
                  </div>
                  {k.proxima_visita && (
                    <p className="mt-1 text-xs text-laton-dk">Próxima visita: {fechaCorta(k.proxima_visita)}</p>
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold">
          Visitas
          <Boton onClick={() => setHoja('visita')} className="min-h-9 px-3 text-sm">registrar</Boton>
        </h2>
        {(visitas.datos ?? []).length === 0 ? (
          <Vacio texto="Sin visitas registradas." />
        ) : (
          <ul className="space-y-2">
            {(visitas.datos ?? []).map(v => (
              <li key={v.id}>
                <Tarjeta className="p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{TIPOS_VISITA[v.tipo]}</span>
                    <span className="text-xs text-faint">{fechaCorta(v.fecha)}</span>
                  </div>
                  {v.resumen && <p className="mt-1 text-sm text-mut">{v.resumen}</p>}
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Hoja abierta={hoja === 'equipo'} titulo="Agregar equipo" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Selector etiqueta="Tipo" opciones={Object.entries(TIPOS_EQUIPO)} value={tipo} onChange={e => setTipo(e.target.value)} />
          <Campo etiqueta="Capacidad" value={capacidad} onChange={e => setCapacidad(e.target.value)} placeholder="12.000 BTU · 2 HP" />
          <Campo etiqueta="Dónde está" value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Sala, bodega, techo" />
          <Boton variante="acento" className="w-full" onClick={guardarEquipo}>Guardar</Boton>
        </div>
      </Hoja>

      <Hoja abierta={hoja === 'contrato'} titulo="Nuevo contrato" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Selector
            etiqueta="Plan"
            opciones={Object.entries(PLANES)}
            value={plan}
            onChange={e => setPlan(e.target.value as PlanContrato)}
          />
          <Campo
            etiqueta="Valor por visita (neto)"
            type="number"
            inputMode="numeric"
            value={valorVisita}
            onChange={e => setValorVisita(e.target.value)}
          />
          <Boton variante="acento" className="w-full" onClick={guardarContrato}>Guardar</Boton>
        </div>
      </Hoja>

      <Hoja abierta={hoja === 'visita'} titulo="Registrar visita" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Selector
            etiqueta="Tipo"
            opciones={Object.entries(TIPOS_VISITA)}
            value={tipoVisita}
            onChange={e => setTipoVisita(e.target.value as TipoVisita)}
          />
          <Area etiqueta="Qué se hizo" value={resumen} onChange={e => setResumen(e.target.value)} />
          <Boton variante="acento" className="w-full" onClick={guardarVisita}>Guardar</Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
