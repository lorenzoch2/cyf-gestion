import { useCallback, useEffect, useState } from 'react'
import { db } from './supabase'
import type {
  Cliente, Contrato, Equipo, LineaPresupuesto, Oportunidad, Presupuesto, Prospecto,
  Servicio, Tarea, Visita,
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

export function consultarProspectos(filtros: { zona?: string; estado?: string; prioridad?: string; busqueda?: string }) {
  let q = db().from('prospectos').select('*')
  if (filtros.zona) q = q.eq('zona', filtros.zona)
  if (filtros.estado) q = q.eq('estado', filtros.estado)
  if (filtros.prioridad) q = q.eq('prioridad', filtros.prioridad)
  if (filtros.busqueda) q = q.ilike('nombre', `%${filtros.busqueda}%`)
  return q.order('prioridad').order('direccion', { nullsFirst: false }).order('nombre').limit(400)
}

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

export type { Cliente, Contrato, Equipo, LineaPresupuesto, Oportunidad, Presupuesto, Prospecto, Servicio, Tarea, Visita }
