import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Confirmar, Dato, Error, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoPin, IconoTelefono, IconoWhatsapp } from '../componentes/iconos'
import {
  borrarProspecto, consultarProspecto, consultarRutas, consultarVisitas, crearCliente,
  crearOportunidad, crearVisita, guardarProspecto, useConsulta,
} from '../lib/datos'
import { enlaceLlamada, enlaceMapa, enlaceWhatsapp, fechaCorta, hoyIso, sumarDias } from '../lib/formato'
import {
  ESTADOS_PROSPECTO, ORDEN_ESTADOS, RUBROS, TIPOS_VISITA, ZONAS,
  type EstadoProspecto, type Prioridad, type Prospecto, type Ruta, type Visita,
} from '../lib/tipos'

const RESULTADOS: [string, string][] = [
  ['Evaluación agendada', 'Evaluación agendada'],
  ['Quedó interesado', 'Quedó interesado'],
  ['Pidió volver', 'Pidió volver'],
  ['No estaba quien decide', 'No estaba quien decide'],
  ['No le interesa', 'No le interesa'],
  ['Ya tiene servicio', 'Ya tiene servicio'],
]

/** Qué estado deja cada resultado. Lo demás queda en «visitado». */
const ESTADO_SEGUN_RESULTADO: Record<string, EstadoProspecto> = {
  'Evaluación agendada': 'evaluacion',
  'Quedó interesado': 'interesado',
  'Pidió volver': 'interesado',
  'No le interesa': 'descartado',
  'Ya tiene servicio': 'descartado',
}

export function ProspectoDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { datos: p, cargando, error, recargar } = useConsulta<Prospecto>(() => consultarProspecto(id), [id])
  const visitas = useConsulta<Visita[]>(() => consultarVisitas({ prospectoId: id }), [id])
  const rutas = useConsulta<Ruta[]>(() => consultarRutas(), [])

  const [hoja, setHoja] = useState<'visita' | 'editar' | null>(null)
  const [confirmar, setConfirmar] = useState<'borrar' | 'cliente' | 'negocio' | null>(null)

  // registrar visita
  const [resultado, setResultado] = useState(RESULTADOS[0][0])
  const [contacto, setContacto] = useState('')
  const [equipos, setEquipos] = useState('')
  const [notas, setNotas] = useState('')
  const [proximoPaso, setProximoPaso] = useState('')
  const [proximoEn, setProximoEn] = useState(sumarDias(7))
  const [guardando, setGuardando] = useState(false)

  // editar ficha
  const [edicion, setEdicion] = useState<Partial<Prospecto>>({})

  if (cargando) return <Cargando />
  if (error || !p) {
    return (
      <Pantalla titulo="Prospecto" volver>
        <Error mensaje={error ?? 'No se encontró este local'} />
      </Pantalla>
    )
  }

  const pinta = ESTADOS_PROSPECTO[p.estado]

  async function cambiarEstado(estado: EstadoProspecto) {
    if (!p || estado === p.estado) return
    await guardarProspecto(p.id, { estado })
    void recargar()
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
      estado: ESTADO_SEGUN_RESULTADO[resultado] ?? 'visitado',
      visitado_en: hoyIso(),
      resultado,
      contacto_nombre: contacto || p.contacto_nombre,
      equipos_declarados: equipos ? Number(equipos) : p.equipos_declarados,
      proximo_paso: proximoPaso || null,
      proximo_paso_en: proximoPaso ? proximoEn : null,
      notas: notas ? [p.notas, notas].filter(Boolean).join('\n') : p.notas,
    })
    setGuardando(false)
    setHoja(null)
    setNotas('')
    setProximoPaso('')
    setContacto('')
    setEquipos('')
    void recargar()
    void visitas.recargar()
  }

  function abrirEdicion() {
    if (!p) return
    setEdicion({
      nombre: p.nombre,
      rubro: p.rubro,
      zona: p.zona,
      direccion: p.direccion,
      telefono: p.telefono,
      horario: p.horario,
      contacto_nombre: p.contacto_nombre,
      contacto_cargo: p.contacto_cargo,
      equipos_declarados: p.equipos_declarados,
      prioridad: p.prioridad,
      ruta_id: p.ruta_id,
      notas: p.notas,
    })
    setHoja('editar')
  }

  async function guardarEdicion() {
    if (!p) return
    setGuardando(true)
    await guardarProspecto(p.id, edicion)
    setGuardando(false)
    setHoja(null)
    void recargar()
  }

  async function convertirEnCliente() {
    if (!p) return
    const { data } = await crearCliente({
      nombre: p.nombre,
      direccion: p.direccion,
      comuna: p.comuna,
      telefono: p.telefono,
      contacto_nombre: p.contacto_nombre,
      lat: p.lat,
      lng: p.lng,
      notas: p.notas,
    })
    if (!data) return
    await guardarProspecto(p.id, { estado: 'cliente', cliente_id: data.id })
    navegar(`/clientes/${data.id}`)
  }

  async function crearNegocio() {
    if (!p) return
    await crearOportunidad({
      titulo: `Mantención — ${p.nombre}`,
      prospecto_id: p.id,
      cliente_id: p.cliente_id,
      etapa: 'evaluacion',
    })
    await guardarProspecto(p.id, { estado: p.estado === 'por_visitar' ? 'interesado' : p.estado })
    navegar('/negocios')
  }

  const tel = enlaceLlamada(p.telefono)
  const wsp = enlaceWhatsapp(
    p.telefono,
    `Hola, le escribo de Calor y Frío Industrial. Pasamos por ${p.nombre} ofreciendo mantención de sus equipos de frío.`,
  )
  const mapa = enlaceMapa(p.lat, p.lng, p.direccion)
  const rutaActual = (rutas.datos ?? []).find(r => r.id === p.ruta_id)

  return (
    <Pantalla
      titulo={p.nombre}
      bajada={[p.rubro, ZONAS[p.zona ?? ''] ?? p.zona].filter(Boolean).join(' · ')}
      volver
      accion={<Boton onClick={abrirEdicion} className="min-h-9 px-3 text-sm">Editar</Boton>}
    >
      <section>
        <p className="mb-2 text-sm font-medium text-mut">Estado de gestión</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {ORDEN_ESTADOS.map(e => {
            const pe = ESTADOS_PROSPECTO[e]
            const activo = p.estado === e
            return (
              <button
                key={e}
                onClick={() => cambiarEstado(e)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  activo ? 'border-grafito bg-grafito text-papel' : 'border-linea-2 bg-white text-mut'
                }`}
              >
                <span className={`size-2 rounded-full ${pe.punto}`} />
                {pe.corta}
              </button>
            )
          })}
        </div>
      </section>

      {/*
        Sin teléfono, «Llamar» y «WhatsApp» eran dos botones apagados ocupando
        dos tercios de la pantalla más usada en la calle, y 309 de los 333
        locales no traen teléfono. Ese espacio pasa a ser la acción que sí
        corresponde: anotarlo, que es justo lo que uno acaba de conseguir
        cuando está parado ahí.
      */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tel ? (
          <>
            <a href={tel}>
              <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
                <span className="text-acero"><IconoTelefono /></span>Llamar
              </Tarjeta>
            </a>
            <a href={wsp ?? undefined} target="_blank" rel="noreferrer" className={!wsp ? 'pointer-events-none opacity-40' : ''}>
              <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
                <span className="text-acero"><IconoWhatsapp /></span>WhatsApp
              </Tarjeta>
            </a>
          </>
        ) : (
          <button onClick={abrirEdicion} className="col-span-2 text-left">
            <Tarjeta className="flex h-full flex-col items-center justify-center gap-1 p-3 text-xs text-mut">
              <span className="text-acero"><IconoTelefono /></span>
              Anotar teléfono
            </Tarjeta>
          </button>
        )}
        <a href={mapa ?? undefined} target="_blank" rel="noreferrer" className={!mapa ? 'pointer-events-none opacity-40' : ''}>
          <Tarjeta className="flex flex-col items-center gap-1 p-3 text-xs text-mut">
            <span className="text-acero"><IconoPin /></span>Mapa
          </Tarjeta>
        </a>
      </div>

      <Boton variante="acento" className="mt-3 w-full" onClick={() => setHoja('visita')}>
        Registrar visita
      </Boton>

      <Tarjeta className="mt-4">
        <Dato etiqueta="Estado">{pinta.etiqueta}</Dato>
        <Dato etiqueta="Dirección">{p.direccion ?? '—'}</Dato>
        <Dato etiqueta="Ruta">{rutaActual?.nombre ?? 'Sin ruta'}</Dato>
        <Dato etiqueta="Equipos que suele tener">{p.equipos_esperados ?? '—'}</Dato>
        {p.equipos_declarados != null && <Dato etiqueta="Equipos declarados">{p.equipos_declarados}</Dato>}
        <Dato etiqueta="Horario">{p.horario ?? '—'}</Dato>
        <Dato etiqueta="Teléfono">{p.telefono ?? '—'}</Dato>
        <Dato etiqueta="Contacto">
          {[p.contacto_nombre, p.contacto_cargo].filter(Boolean).join(' · ') || '—'}
        </Dato>
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
        <Boton onClick={() => setConfirmar('negocio')}>Crear negocio</Boton>
        <Boton onClick={() => setConfirmar('cliente')} disabled={p.estado === 'cliente'}>
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

      <Boton variante="peligro" className="mt-6 w-full" onClick={() => setConfirmar('borrar')}>
        Quitar este local de la lista
      </Boton>

      {/* ── Registrar visita ── */}
      <Hoja abierta={hoja === 'visita'} titulo="Registrar visita" alCerrar={() => setHoja(null)}>
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
          <Area
            etiqueta="Notas"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Qué equipos, qué falla, hace cuánto no los mantienen"
          />
          <Campo etiqueta="Próximo paso" value={proximoPaso} onChange={e => setProximoPaso(e.target.value)} placeholder="Volver a hablar con el dueño" />
          {proximoPaso && <Campo etiqueta="Cuándo" type="date" value={proximoEn} onChange={e => setProximoEn(e.target.value)} />}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={registrarVisita} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar visita'}
            </Boton>
          </div>
          <p className="text-xs text-faint">
            Nada queda registrado hasta que toques «Guardar visita».
          </p>
        </div>
      </Hoja>

      {/* ── Editar ficha ── */}
      <Hoja abierta={hoja === 'editar'} titulo="Editar local" alCerrar={() => setHoja(null)}>
        <div className="space-y-3">
          <Campo etiqueta="Nombre" value={edicion.nombre ?? ''} onChange={e => setEdicion({ ...edicion, nombre: e.target.value })} />
          <Selector
            etiqueta="Rubro"
            opciones={RUBROS.map(r => [r, r] as [string, string])}
            value={edicion.rubro ?? 'Otro'}
            onChange={e => setEdicion({ ...edicion, rubro: e.target.value })}
          />
          <Selector
            etiqueta="Zona"
            opciones={Object.entries(ZONAS)}
            value={edicion.zona ?? 'egana'}
            onChange={e => setEdicion({ ...edicion, zona: e.target.value })}
          />
          <Selector
            etiqueta="Ruta"
            opciones={[['', 'Sin ruta'], ...(rutas.datos ?? []).map(r => [r.id, r.nombre] as [string, string])]}
            value={edicion.ruta_id ?? ''}
            onChange={e => setEdicion({ ...edicion, ruta_id: e.target.value || null })}
          />
          <Campo etiqueta="Dirección" value={edicion.direccion ?? ''} onChange={e => setEdicion({ ...edicion, direccion: e.target.value })} />
          <Campo etiqueta="Teléfono" inputMode="tel" value={edicion.telefono ?? ''} onChange={e => setEdicion({ ...edicion, telefono: e.target.value })} />
          <Campo etiqueta="Horario" value={edicion.horario ?? ''} onChange={e => setEdicion({ ...edicion, horario: e.target.value })} />
          <Campo etiqueta="Contacto" value={edicion.contacto_nombre ?? ''} onChange={e => setEdicion({ ...edicion, contacto_nombre: e.target.value })} />
          <Campo etiqueta="Cargo del contacto" value={edicion.contacto_cargo ?? ''} onChange={e => setEdicion({ ...edicion, contacto_cargo: e.target.value })} />
          <Campo
            etiqueta="Equipos declarados"
            type="number"
            inputMode="numeric"
            value={edicion.equipos_declarados ?? ''}
            onChange={e => setEdicion({ ...edicion, equipos_declarados: e.target.value ? Number(e.target.value) : null })}
          />
          <Selector
            etiqueta="Prioridad"
            opciones={[['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']]}
            value={edicion.prioridad ?? 'media'}
            onChange={e => setEdicion({ ...edicion, prioridad: e.target.value as Prioridad })}
          />
          <Area etiqueta="Notas" value={edicion.notas ?? ''} onChange={e => setEdicion({ ...edicion, notas: e.target.value })} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardarEdicion} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
          </div>
        </div>
      </Hoja>

      <Confirmar
        abierta={confirmar === 'borrar'}
        titulo="¿Quitar este local?"
        detalle={`«${p.nombre}» sale de la lista junto con sus visitas registradas. No se puede deshacer.`}
        textoAceptar="Quitar"
        peligro
        alCerrar={() => setConfirmar(null)}
        alAceptar={async () => {
          await borrarProspecto(p.id)
          navegar('/prospectos')
        }}
      />
      <Confirmar
        abierta={confirmar === 'cliente'}
        titulo="¿Pasar a cliente?"
        detalle="Se crea una ficha de cliente con estos datos y el local queda marcado como cliente."
        textoAceptar="Crear cliente"
        alCerrar={() => setConfirmar(null)}
        alAceptar={convertirEnCliente}
      />
      <Confirmar
        abierta={confirmar === 'negocio'}
        titulo="¿Crear un negocio?"
        detalle="Queda en la lista de negocios, en etapa de evaluación, para seguirle el rastro."
        textoAceptar="Crear negocio"
        alCerrar={() => setConfirmar(null)}
        alAceptar={crearNegocio}
      />
    </Pantalla>
  )
}
