import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Dato, Error, Etiqueta, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoPin, IconoTelefono, IconoWhatsapp } from '../componentes/iconos'
import {
  consultarProspecto, consultarVisitas, crearCliente, crearOportunidad, crearVisita,
  guardarProspecto, useConsulta,
} from '../lib/datos'
import { enlaceLlamada, enlaceMapa, enlaceWhatsapp, fechaCorta, hoyIso, sumarDias } from '../lib/formato'
import { ESTADOS_PROSPECTO, TIPOS_VISITA, ZONAS, type EstadoProspecto, type Prospecto, type Visita } from '../lib/tipos'

const RESULTADOS: [string, string][] = [
  ['Evaluación agendada', 'Evaluación agendada'],
  ['Pidió volver', 'Pidió volver'],
  ['No estaba quien decide', 'No estaba quien decide'],
  ['No le interesa', 'No le interesa'],
  ['Ya tiene servicio', 'Ya tiene servicio'],
]

export function ProspectoDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { datos: p, cargando, error, recargar } = useConsulta<Prospecto>(() => consultarProspecto(id), [id])
  const visitas = useConsulta<Visita[]>(() => consultarVisitas({ prospectoId: id }), [id])

  const [abierta, setAbierta] = useState(false)
  const [resultado, setResultado] = useState(RESULTADOS[0][0])
  const [contacto, setContacto] = useState('')
  const [equipos, setEquipos] = useState('')
  const [notas, setNotas] = useState('')
  const [proximoPaso, setProximoPaso] = useState('')
  const [proximoEn, setProximoEn] = useState(sumarDias(7))
  const [guardando, setGuardando] = useState(false)

  if (cargando) return <Cargando />
  if (error || !p) return <Pantalla titulo="Prospecto" volver><Error mensaje={error ?? 'No se encontró'} /></Pantalla>

  const estadoSegun: Record<string, EstadoProspecto> = {
    'Evaluación agendada': 'evaluacion',
    'No le interesa': 'descartado',
    'Ya tiene servicio': 'descartado',
  }

  async function registrarVisita() {
    if (!p) return
    setGuardando(true)
    await crearVisita({
      prospecto_id: p.id,
      tipo: 'prospeccion',
      fecha: hoyIso(),
      resumen: `${resultado}${notas ? ' — ' + notas : ''}`,
      proximo_paso: proximoPaso || null,
      proximo_paso_en: proximoPaso ? proximoEn : null,
    })
    await guardarProspecto(p.id, {
      estado: estadoSegun[resultado] ?? 'visitado',
      visitado_en: hoyIso(),
      resultado,
      contacto_nombre: contacto || p.contacto_nombre,
      equipos_declarados: equipos ? Number(equipos) : p.equipos_declarados,
      proximo_paso: proximoPaso || null,
      proximo_paso_en: proximoPaso ? proximoEn : null,
      notas: notas ? [p.notas, notas].filter(Boolean).join('\n') : p.notas,
    })
    setGuardando(false)
    setAbierta(false)
    setNotas('')
    setProximoPaso('')
    void recargar()
    void visitas.recargar()
  }

  async function convertirEnCliente() {
    if (!p) return
    const { data, error } = await crearCliente({
      nombre: p.nombre,
      direccion: p.direccion,
      comuna: p.comuna,
      telefono: p.telefono,
      contacto_nombre: p.contacto_nombre,
      lat: p.lat,
      lng: p.lng,
      notas: p.notas,
    })
    if (error || !data) return
    await guardarProspecto(p.id, { estado: 'cliente', cliente_id: data.id })
    navegar(`/clientes/${data.id}`)
  }

  async function crearNegocio() {
    if (!p) return
    const { data } = await crearOportunidad({
      titulo: `Mantención — ${p.nombre}`,
      prospecto_id: p.id,
      cliente_id: p.cliente_id,
      etapa: 'evaluacion',
    })
    if (data) navegar('/negocios')
  }

  const tel = enlaceLlamada(p.telefono)
  const wsp = enlaceWhatsapp(
    p.telefono,
    `Hola, le escribo de Calor y Frío Industrial. Pasamos por ${p.nombre} ofreciendo mantención de sus equipos de frío.`,
  )
  const mapa = enlaceMapa(p.lat, p.lng, p.direccion)

  return (
    <Pantalla
      titulo={p.nombre}
      bajada={[p.rubro, ZONAS[p.zona ?? ''] ?? p.zona].filter(Boolean).join(' · ')}
      volver
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Etiqueta tono={p.estado === 'cliente' ? 'verde' : p.estado === 'descartado' ? 'mut' : 'acero'}>
          {ESTADOS_PROSPECTO[p.estado]}
        </Etiqueta>
        {p.prioridad === 'alta' && <Etiqueta tono="laton">prioridad alta</Etiqueta>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={tel ?? undefined} className={!tel ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoTelefono /></span>
            Llamar
          </Tarjeta>
        </a>
        <a href={wsp ?? undefined} target="_blank" rel="noreferrer" className={!wsp ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoWhatsapp /></span>
            WhatsApp
          </Tarjeta>
        </a>
        <a href={mapa ?? undefined} target="_blank" rel="noreferrer" className={!mapa ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoPin /></span>
            Mapa
          </Tarjeta>
        </a>
      </div>

      <Boton variante="acento" className="mt-3 w-full" onClick={() => setAbierta(true)}>
        Registrar visita
      </Boton>

      <Tarjeta className="mt-4">
        <Dato etiqueta="Dirección">{p.direccion ?? '—'}</Dato>
        <Dato etiqueta="Equipos que suele tener">{p.equipos_esperados ?? '—'}</Dato>
        {p.equipos_declarados != null && <Dato etiqueta="Equipos declarados">{p.equipos_declarados}</Dato>}
        <Dato etiqueta="Horario">{p.horario ?? '—'}</Dato>
        <Dato etiqueta="Teléfono">{p.telefono ?? '—'}</Dato>
        <Dato etiqueta="Contacto">{p.contacto_nombre ?? '—'}</Dato>
        <Dato etiqueta="Última visita">{fechaCorta(p.visitado_en)}</Dato>
        {p.proximo_paso && (
          <Dato etiqueta="Próximo paso">
            {p.proximo_paso} · {fechaCorta(p.proximo_paso_en)}
          </Dato>
        )}
      </Tarjeta>

      {p.notas && (
        <Tarjeta className="mt-3">
          <p className="whitespace-pre-line text-sm text-mut">{p.notas}</p>
        </Tarjeta>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Boton onClick={crearNegocio}>Crear negocio</Boton>
        <Boton onClick={convertirEnCliente} disabled={p.estado === 'cliente'}>
          {p.estado === 'cliente' ? 'Ya es cliente' : 'Pasar a cliente'}
        </Boton>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Visitas</h2>
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

      <Hoja abierta={abierta} titulo="Registrar visita" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Selector etiqueta="Resultado" opciones={RESULTADOS} value={resultado} onChange={e => setResultado(e.target.value)} />
          <Campo etiqueta="Con quién habló" value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Nombre y cargo" />
          <Campo
            etiqueta="Cuántos equipos tiene"
            type="number"
            inputMode="numeric"
            value={equipos}
            onChange={e => setEquipos(e.target.value)}
          />
          <Area etiqueta="Notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Qué equipos, qué falla, hace cuánto no los mantienen" />
          <Campo etiqueta="Próximo paso" value={proximoPaso} onChange={e => setProximoPaso(e.target.value)} placeholder="Volver a hablar con el dueño" />
          {proximoPaso && (
            <Campo etiqueta="Cuándo" type="date" value={proximoEn} onChange={e => setProximoEn(e.target.value)} />
          )}
          <Boton variante="acento" className="w-full" onClick={registrarVisita} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar visita'}
          </Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
