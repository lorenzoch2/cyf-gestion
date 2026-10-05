import { useCallback, useEffect, useState } from 'react'
import { db } from './supabase'
import type {
  Cliente, Contrato, Equipo, LineaPresupuesto, Oportunidad, PrecioTarifario, Presupuesto,
  Prospecto, Ruta, Servicio, Tarea, Tarifario, Visita,
} from './tipos'

/*
  Acceso a datos.

  Sin librería de caché: la app la usan dos personas en un teléfono, y una
  consulta directa con `useConsulta` es más fácil de seguir que un caché que
  haya que invalidar. Cada pantalla pide lo suyo y recarga cuando escribe.
*/

export function useConsulta<T>(consulta: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(async () => {
    setCargando(true)
    const { data, error } = await consulta()
    setDatos(data)
    setError(error ? error.message : null)
    setCargando(false)
  }, deps)

  useEffect(() => {
    void ejecutar()
  }, [ejecutar])

  return { datos, error, cargando, recargar: ejecutar }
}

/* ── Prospectos ─────────────────────────────────────────────────────────── */

export interface FiltrosProspecto {
  zona?: string
  estados?: string[]
  prioridad?: string
  rutaId?: string
  sinRuta?: boolean
  busqueda?: string
}

export function consultarProspectos(filtros: FiltrosProspecto) {
  let q = db().from('prospectos').select('*')
  if (filtros.zona) q = q.eq('zona', filtros.zona)
  if (filtros.estados?.length) q = q.in('estado', filtros.estados)
  if (filtros.prioridad) q = q.eq('prioridad', filtros.prioridad)
  if (filtros.rutaId) q = q.eq('ruta_id', filtros.rutaId)
  if (filtros.sinRuta) q = q.is('ruta_id', null)
  // El buscador mira nombre y dirección: en la calle uno busca por cualquiera.
  if (filtros.busqueda) {
    const t = filtros.busqueda.replace(/[%,]/g, ' ')
    q = q.or(`nombre.ilike.%${t}%,direccion.ilike.%${t}%,rubro.ilike.%${t}%`)
  }
  return q.order('prioridad').order('direccion', { nullsFirst: false }).order('nombre').limit(500)
}

export const crearProspecto = (prospecto: Partial<Prospecto>) =>
  db().from('prospectos').insert({ ...prospecto, origen: 'manual' }).select().single()

export const borrarProspecto = (id: string) => db().from('prospectos').delete().eq('id', id)

export const consultarProspecto = (id: string) =>
  db().from('prospectos').select('*').eq('id', id).single()

export const guardarProspecto = (id: string, cambios: Partial<Prospecto>) =>
  db().from('prospectos').update(cambios).eq('id', id)

/* ── Clientes ───────────────────────────────────────────────────────────── */

export const consultarClientes = (busqueda?: string) => {
  let q = db().from('clientes').select('*')
  if (busqueda) q = q.ilike('nombre', `%${busqueda}%`)
  return q.order('nombre').limit(300)
}

export const consultarCliente = (id: string) =>
  db().from('clientes').select('*').eq('id', id).single()

export const crearCliente = (cliente: Partial<Cliente>) =>
  db().from('clientes').insert(cliente).select().single()

export const guardarCliente = (id: string, cambios: Partial<Cliente>) =>
  db().from('clientes').update(cambios).eq('id', id)

export const consultarEquipos = (clienteId: string) =>
  db().from('equipos').select('*').eq('cliente_id', clienteId).order('creado_en')

export const crearEquipo = (equipo: Partial<Equipo>) => db().from('equipos').insert(equipo)

export const borrarEquipo = (id: string) => db().from('equipos').delete().eq('id', id)

export const consultarContratos = (clienteId: string) =>
  db().from('contratos').select('*').eq('cliente_id', clienteId).order('creado_en', { ascending: false })

export const crearContrato = (contrato: Partial<Contrato>) => db().from('contratos').insert(contrato)

/* ── Visitas ────────────────────────────────────────────────────────────── */

export const consultarVisitas = (filtro: { clienteId?: string; prospectoId?: string }) => {
  let q = db().from('visitas').select('*')
  if (filtro.clienteId) q = q.eq('cliente_id', filtro.clienteId)
  if (filtro.prospectoId) q = q.eq('prospecto_id', filtro.prospectoId)
  return q.order('fecha', { ascending: false }).limit(50)
}

export const crearVisita = (visita: Partial<Visita>) => db().from('visitas').insert(visita)

/* ── Oportunidades ──────────────────────────────────────────────────────── */

export const consultarOportunidades = (soloAbiertas = false) => {
  let q = db().from('oportunidades').select('*')
  if (soloAbiertas) q = q.in('etapa', ['nueva', 'evaluacion', 'cotizada', 'negociacion'])
  return q.order('actualizado_en', { ascending: false }).limit(200)
}

export const consultarOportunidad = (id: string) =>
  db().from('oportunidades').select('*').eq('id', id).single()

export const crearOportunidad = (oportunidad: Partial<Oportunidad>) =>
  db().from('oportunidades').insert(oportunidad).select().single()

export const guardarOportunidad = (id: string, cambios: Partial<Oportunidad>) =>
  db().from('oportunidades').update(cambios).eq('id', id)

/* ── Tareas ─────────────────────────────────────────────────────────────── */

export const consultarTareas = (soloPendientes = true) => {
  let q = db().from('tareas').select('*')
  if (soloPendientes) q = q.eq('hecha', false)
  return q.order('vence_en', { nullsFirst: false }).limit(200)
}

export const crearTarea = (tarea: Partial<Tarea>) => db().from('tareas').insert(tarea)

export const guardarTarea = (id: string, cambios: Partial<Tarea>) =>
  db().from('tareas').update(cambios).eq('id', id)

export const borrarTarea = (id: string) => db().from('tareas').delete().eq('id', id)

/* ── Tarifario ──────────────────────────────────────────────────────────── */

export const consultarServicios = () =>
  db().from('servicios').select('*').eq('activo', true).order('orden')

export const guardarServicio = (id: string, cambios: Partial<Servicio>) =>
  db().from('servicios').update(cambios).eq('id', id)

/* ── Presupuestos ───────────────────────────────────────────────────────── */

export const consultarPresupuestos = () =>
  db().from('presupuestos').select('*').order('fecha', { ascending: false }).limit(200)

export const consultarPresupuesto = (id: string) =>
  db().from('presupuestos').select('*').eq('id', id).single()

export const crearPresupuesto = (presupuesto: Partial<Presupuesto>) =>
  db().from('presupuestos').insert(presupuesto).select().single()

export const guardarPresupuesto = (id: string, cambios: Partial<Presupuesto>) =>
  db().from('presupuestos').update(cambios).eq('id', id)

export const borrarPresupuesto = (id: string) => db().from('presupuestos').delete().eq('id', id)

export const consultarLineas = (presupuestoId: string) =>
  db().from('presupuesto_lineas').select('*').eq('presupuesto_id', presupuestoId).order('orden')

export const crearLinea = (linea: Partial<LineaPresupuesto>) =>
  db().from('presupuesto_lineas').insert(linea)

export const guardarLinea = (id: string, cambios: Partial<LineaPresupuesto>) =>
  db().from('presupuesto_lineas').update(cambios).eq('id', id)

export const borrarLinea = (id: string) => db().from('presupuesto_lineas').delete().eq('id', id)

/** El número del presupuesto sigue la numeración de la empresa: AAAA-NNN. */
export async function siguienteNumero(): Promise<string> {
  const anio = new Date().getFullYear()
  const { data } = await db()
    .from('presupuestos')
    .select('numero')
    .like('numero', `${anio}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const ultimo = data?.[0]?.numero as string | undefined
  const correlativo = ultimo ? Number(ultimo.split('-')[1]) + 1 : 1
  return `${anio}-${String(correlativo).padStart(3, '0')}`
}

/* ── Resumen de la portada ──────────────────────────────────────────────── */

export async function consultarResumen() {
  const cliente = db()
  const [prospectos, porVisitar, visitadosHoy, oportunidades, tareas] = await Promise.all([
    cliente.from('prospectos').select('id', { count: 'exact', head: true }),
    cliente.from('prospectos').select('id', { count: 'exact', head: true }).eq('estado', 'por_visitar'),
    cliente.from('prospectos').select('id', { count: 'exact', head: true })
      .eq('visitado_en', new Date().toISOString().slice(0, 10)),
    cliente.from('oportunidades').select('monto_neto, etapa')
      .in('etapa', ['nueva', 'evaluacion', 'cotizada', 'negociacion']),
    cliente.from('tareas').select('id', { count: 'exact', head: true }).eq('hecha', false),
  ])
  const abiertas = (oportunidades.data ?? []) as { monto_neto: number | null }[]
  return {
    prospectos: prospectos.count ?? 0,
    porVisitar: porVisitar.count ?? 0,
    visitadosHoy: visitadosHoy.count ?? 0,
    oportunidadesAbiertas: abiertas.length,
    montoEnJuego: abiertas.reduce((t, o) => t + (o.monto_neto ?? 0), 0),
    tareasPendientes: tareas.count ?? 0,
  }
}

/* ── Rutas de visita ────────────────────────────────────────────────────── */

export const consultarRutas = () =>
  db().from('rutas').select('*').order('fecha', { ascending: false, nullsFirst: false }).limit(100)

export const crearRuta = (ruta: Partial<Ruta>) => db().from('rutas').insert(ruta).select().single()

export const guardarRuta = (id: string, cambios: Partial<Ruta>) =>
  db().from('rutas').update(cambios).eq('id', id)

export const borrarRuta = (id: string) => db().from('rutas').delete().eq('id', id)

/** Cuántos locales tiene cada ruta y cuántos siguen por visitar. */
export async function resumenRutas(): Promise<Record<string, { total: number; porVisitar: number }>> {
  const { data } = await db().from('prospectos').select('ruta_id, estado').not('ruta_id', 'is', null)
  const cuenta: Record<string, { total: number; porVisitar: number }> = {}
  for (const fila of (data ?? []) as { ruta_id: string; estado: string }[]) {
    const r = (cuenta[fila.ruta_id] ??= { total: 0, porVisitar: 0 })
    r.total += 1
    if (fila.estado === 'por_visitar') r.porVisitar += 1
  }
  return cuenta
}

/* ── Tarifarios ─────────────────────────────────────────────────────────── */

export const consultarTarifarios = () =>
  db().from('tarifarios').select('*').eq('activo', true).order('tipo').order('nombre')

export const crearTarifario = (tarifario: Partial<Tarifario>) =>
  db().from('tarifarios').insert(tarifario).select().single()

export const guardarTarifario = (id: string, cambios: Partial<Tarifario>) =>
  db().from('tarifarios').update(cambios).eq('id', id)

export const borrarTarifario = (id: string) => db().from('tarifarios').delete().eq('id', id)

export const consultarPrecios = (tarifarioId: string) =>
  db().from('tarifario_precios').select('*').eq('tarifario_id', tarifarioId)

/** Fija el precio de un servicio en un tarifario; si ya existía, lo reemplaza. */
export const fijarPrecio = (tarifarioId: string, servicioId: string, precioNeto: number) =>
  db()
    .from('tarifario_precios')
    .upsert({ tarifario_id: tarifarioId, servicio_id: servicioId, precio_neto: precioNeto },
            { onConflict: 'tarifario_id,servicio_id' })

/** Saca un servicio de un tarifario: vuelve a regir el precio base. */
export const quitarPrecio = (tarifarioId: string, servicioId: string) =>
  db().from('tarifario_precios').delete().eq('tarifario_id', tarifarioId).eq('servicio_id', servicioId)

export const crearServicio = (servicio: Partial<Servicio>) =>
  db().from('servicios').insert(servicio).select().single()

export const borrarServicio = (id: string) =>
  db().from('servicios').update({ activo: false }).eq('id', id)

/**
 * Qué tarifario le toca a un cliente: el suyo, el de su zona, o el general.
 * Devuelve también los precios ya resueltos, listos para armar un presupuesto.
 */
export async function tarifarioQueAplica(clienteId?: string | null, zona?: string | null) {
  const { data } = await db().from('tarifarios').select('*').eq('activo', true)
  const tarifarios = (data ?? []) as Tarifario[]
  const elegido =
    (clienteId ? tarifarios.find(t => t.tipo === 'cliente' && t.cliente_id === clienteId) : undefined) ??
    (zona ? tarifarios.find(t => t.tipo === 'zona' && t.zona === zona) : undefined) ??
    tarifarios.find(t => t.tipo === 'base')
  if (!elegido) return { tarifario: null, precios: {} as Record<string, number> }

  const base = tarifarios.find(t => t.tipo === 'base')
  const ids = [base?.id, elegido.id].filter(Boolean) as string[]
  const { data: filas } = await db().from('tarifario_precios').select('*').in('tarifario_id', ids)

  // Primero el base, encima el elegido: lo específico pisa lo general.
  const precios: Record<string, number> = {}
  for (const id of ids) {
    for (const f of (filas ?? []) as PrecioTarifario[]) {
      if (f.tarifario_id === id) precios[f.servicio_id] = f.precio_neto
    }
  }
  return { tarifario: elegido, precios }
}

export type {
  Cliente, Contrato, Equipo, LineaPresupuesto, Oportunidad, PrecioTarifario, Presupuesto,
  Prospecto, Ruta, Servicio, Tarea, Tarifario, Visita,
}
