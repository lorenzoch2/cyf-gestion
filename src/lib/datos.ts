import { useCallback, useEffect, useState } from 'react'
import { db } from './supabase'
import { reportarConsulta } from './conexion'
import type {
  Cliente, Contrato, Equipo, LineaPresupuesto, Oportunidad, PrecioTarifario, Presupuesto,
  Prospecto, Ruta, Servicio, Tarea, Tarifario, Visita,
  CotizacionInsumo, Existencia, Insumo, Tecnico,
  LineaOrden, Mantencion, OrdenCompra, Proveedor,
  Documento, FotoInforme, Hallazgo, Informe, InformeEquipo, MaterialInforme, Movimiento,
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

  /*
    El `try` no es decorativo.

    Supabase normalmente devuelve el error dentro del resultado, pero si el
    `fetch` se cae —señal que se corta a mitad de la calle— la promesa se
    rechaza y el `await` lanza. Sin atrapar eso, `setCargando(false)` nunca
    corre y la pantalla se queda en «Cargando…» para siempre, sin decir nada.
    Pasó de verdad al probarlo con la red cortada.

    La franja de arriba dice la verdad cuando las consultas dejan de llegar:
    sin ella un error de red se ve igual que una lista vacía.
  */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await consulta()
      setDatos(data)
      setError(error ? error.message : null)
      reportarConsulta(Boolean(error))
    } catch (falla) {
      setDatos(null)
      setError((falla as Error).message)
      reportarConsulta(true)
    } finally {
      setCargando(false)
    }
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

/**
 * Borrar un cliente se lleva por delante sus equipos, contratos, visitas y
 * mantenciones: así está declarado en el esquema. Por eso la pantalla pregunta
 * antes y lo dice con todas sus letras.
 */
export const borrarCliente = (id: string) => db().from('clientes').delete().eq('id', id)

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

export const crearVisita = (visita: Partial<Visita>) =>
  db().from('visitas').insert(visita).select().single()

export const borrarVisita = (id: string) => db().from('visitas').delete().eq('id', id)

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

/** Se podía crear un negocio de un toque y no había cómo deshacerlo. */
export const borrarOportunidad = (id: string) =>
  db().from('oportunidades').delete().eq('id', id)

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

/** Mete un puñado de locales en una ruta de una sola vez. */
export const asignarRuta = (ids: string[], rutaId: string | null) =>
  db().from('prospectos').update({ ruta_id: rutaId }).in('id', ids)

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
  CotizacionInsumo, Existencia, Insumo, Tecnico,
  LineaOrden, Mantencion, OrdenCompra, Proveedor,
  Documento, FotoInforme, Hallazgo, Informe, InformeEquipo, MaterialInforme, Movimiento,
}

/* ── Equipo ─────────────────────────────────────────────────────────────── */

export const consultarTecnicos = (soloActivos = false) => {
  const q = db().from('tecnicos').select('*').order('orden')
  return soloActivos ? q.eq('activo', true) : q
}

export const crearTecnico = (tecnico: Partial<Tecnico>) =>
  db().from('tecnicos').insert(tecnico).select().single()

export const guardarTecnico = (id: string, cambios: Partial<Tecnico>) =>
  db().from('tecnicos').update(cambios).eq('id', id)

export const borrarTecnico = (id: string) => db().from('tecnicos').delete().eq('id', id)

/* ── Inventario ─────────────────────────────────────────────────────────── */

export const consultarCatalogo = () =>
  db().from('catalogo_insumos').select('*').eq('activo', true).order('orden')

export const crearInsumo = (insumo: Partial<Insumo>) =>
  db().from('catalogo_insumos').insert(insumo).select().single()

export const guardarInsumo = (id: string, cambios: Partial<Insumo>) =>
  db().from('catalogo_insumos').update(cambios).eq('id', id)

/** Dar de baja un ítem del catálogo no borra su historia: lo desactiva. */
export const desactivarInsumo = (id: string) =>
  db().from('catalogo_insumos').update({ activo: false }).eq('id', id)

export const consultarExistencias = () => db().from('existencias').select('*')

/**
 * Deja un ítem en un estado para un dueño, haya fila o no.
 *
 * No se usa `upsert` porque la unicidad vive en un índice con `coalesce` —en
 * SQL dos nulos no son iguales, y «sin asignar» tiene que contar como dueño—,
 * y `upsert` necesita una restricción con nombre sobre columnas simples.
 */
export async function fijarExistencia(
  insumoId: string,
  tecnicoId: string | null,
  cambios: Partial<Existencia>,
) {
  const busca = db().from('existencias').select('id').eq('insumo_id', insumoId)
  const { data } = await (tecnicoId
    ? busca.eq('tecnico_id', tecnicoId)
    : busca.is('tecnico_id', null)
  ).maybeSingle()

  const fila = { ...cambios, actualizado_en: new Date().toISOString() }
  if (data) return db().from('existencias').update(fila).eq('id', (data as { id: string }).id)
  return db()
    .from('existencias')
    .insert({ insumo_id: insumoId, tecnico_id: tecnicoId, estado: 'falta', ...fila })
}

export const asignarExistencia = (id: string, tecnicoId: string | null) =>
  db()
    .from('existencias')
    .update({ tecnico_id: tecnicoId, actualizado_en: new Date().toISOString() })
    .eq('id', id)

/* ── Cotizaciones de insumos ────────────────────────────────────────────── */

export const consultarCotizacionesInsumo = (insumoId?: string) => {
  const q = db().from('cotizaciones_insumo').select('*').order('fecha', { ascending: false })
  return insumoId ? q.eq('insumo_id', insumoId) : q
}

export const crearCotizacionInsumo = (cotizacion: Partial<CotizacionInsumo>) =>
  db().from('cotizaciones_insumo').insert(cotizacion).select().single()

export const guardarCotizacionInsumo = (id: string, cambios: Partial<CotizacionInsumo>) =>
  db().from('cotizaciones_insumo').update(cambios).eq('id', id)

export const borrarCotizacionInsumo = (id: string) =>
  db().from('cotizaciones_insumo').delete().eq('id', id)

/**
 * Marcar una cotización como comprada deja el ítem en «lo tenemos».
 *
 * Es el gesto que cierra el circuito: se cotizó, se compró, está. Hacerlo en
 * dos pantallas distintas garantizaba que la segunda se olvidara.
 */
export async function marcarComprada(
  cotizacion: CotizacionInsumo,
  tecnicoId: string | null,
) {
  await guardarCotizacionInsumo(cotizacion.id, { estado: 'comprada' })
  return fijarExistencia(cotizacion.insumo_id, tecnicoId, {
    estado: 'tiene',
    cantidad: cotizacion.cantidad,
    valor: cotizacion.precio_neto,
  })
}

/* ── Proveedores ────────────────────────────────────────────────────────── */

export const consultarProveedores = (soloActivos = false) => {
  const q = db().from('proveedores').select('*').order('nombre')
  return soloActivos ? q.eq('activo', true) : q
}

export const crearProveedor = (proveedor: Partial<Proveedor>) =>
  db().from('proveedores').insert(proveedor).select().single()

export const guardarProveedor = (id: string, cambios: Partial<Proveedor>) =>
  db().from('proveedores').update(cambios).eq('id', id)

export const borrarProveedor = (id: string) => db().from('proveedores').delete().eq('id', id)

/* ── Órdenes de compra ──────────────────────────────────────────────────── */

export const consultarOrdenes = () =>
  db().from('ordenes_compra').select('*').order('fecha', { ascending: false })

export const consultarOrden = (id: string) =>
  db().from('ordenes_compra').select('*').eq('id', id).single()

export const crearOrden = (orden: Partial<OrdenCompra>) =>
  db().from('ordenes_compra').insert(orden).select().single()

export const guardarOrden = (id: string, cambios: Partial<OrdenCompra>) =>
  db()
    .from('ordenes_compra')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)

export const borrarOrden = (id: string) => db().from('ordenes_compra').delete().eq('id', id)

export const consultarLineasOrden = (ordenId: string) =>
  db().from('orden_lineas').select('*').eq('orden_id', ordenId).order('orden')

export const crearLineaOrden = (linea: Partial<LineaOrden>) =>
  db().from('orden_lineas').insert(linea).select().single()

export const guardarLineaOrden = (id: string, cambios: Partial<LineaOrden>) =>
  db().from('orden_lineas').update(cambios).eq('id', id)

export const borrarLineaOrden = (id: string) => db().from('orden_lineas').delete().eq('id', id)

/** Las órdenes llevan la misma numeración que los presupuestos: OC AAAA-NNN. */
export async function siguienteNumeroOrden(): Promise<string> {
  const anio = new Date().getFullYear()
  const { data } = await db()
    .from('ordenes_compra')
    .select('numero')
    .like('numero', `${anio}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const ultimo = data?.[0]?.numero as string | undefined
  const correlativo = ultimo ? Number(ultimo.split('-')[1]) + 1 : 1
  return `${anio}-${String(correlativo).padStart(3, '0')}`
}

/**
 * Pasa a la orden lo que falta y este proveedor ya cotizó.
 *
 * Es el punto donde el inventario y las compras se tocan: si un ítem está en
 * «falta» o «se acabó» y hay un precio de este proveedor, no tiene sentido
 * volver a escribirlo a mano.
 */
export async function agregarFaltantesDeProveedor(ordenId: string, proveedorId: string) {
  const [{ data: cotizaciones }, { data: existencias }, { data: catalogo }] = await Promise.all([
    db().from('cotizaciones_insumo').select('*').eq('proveedor_id', proveedorId),
    db().from('existencias').select('insumo_id, estado'),
    db().from('catalogo_insumos').select('id, nombre'),
  ])

  const tienen = new Set(
    ((existencias ?? []) as { insumo_id: string; estado: string }[])
      .filter(e => e.estado === 'tiene')
      .map(e => e.insumo_id),
  )
  const nombres = new Map(
    ((catalogo ?? []) as { id: string; nombre: string }[]).map(c => [c.id, c.nombre]),
  )

  // Una sola línea por insumo, con el precio más barato que haya de este proveedor.
  const mejor = new Map<string, CotizacionInsumo>()
  for (const c of (cotizaciones ?? []) as CotizacionInsumo[]) {
    if (c.estado === 'descartada' || tienen.has(c.insumo_id)) continue
    const previa = mejor.get(c.insumo_id)
    if (!previa || (c.precio_neto ?? Infinity) < (previa.precio_neto ?? Infinity)) {
      mejor.set(c.insumo_id, c)
    }
  }
  if (mejor.size === 0) return 0

  const { data: yaEstan } = await db()
    .from('orden_lineas')
    .select('insumo_id')
    .eq('orden_id', ordenId)
  const puestos = new Set(
    ((yaEstan ?? []) as { insumo_id: string | null }[]).map(l => l.insumo_id),
  )

  const lineas = [...mejor.values()]
    .filter(c => !puestos.has(c.insumo_id))
    .map((c, i) => ({
      orden_id: ordenId,
      insumo_id: c.insumo_id,
      descripcion: nombres.get(c.insumo_id) ?? 'Insumo',
      cantidad: c.cantidad,
      precio_neto: Math.round(c.precio_neto ?? 0),
      orden: (i + 1) * 10,
    }))
  if (lineas.length === 0) return 0

  await db().from('orden_lineas').insert(lineas)
  return lineas.length
}

/**
 * Recibir la orden deja en «lo tenemos» todo lo que traía.
 *
 * Sin esto habría que ir ítem por ítem al inventario después de cada compra, y
 * es exactamente el paso que nadie hace.
 */
export async function recibirOrden(ordenId: string) {
  const { data } = await consultarLineasOrden(ordenId)
  for (const l of ((data ?? []) as LineaOrden[]).filter(x => x.insumo_id)) {
    await fijarExistencia(l.insumo_id as string, null, {
      estado: 'tiene',
      cantidad: l.cantidad,
      valor: l.precio_neto,
    })
  }
  return guardarOrden(ordenId, { estado: 'recibida' })
}

/* ── Mantenciones programadas ───────────────────────────────────────────── */

export const consultarMantenciones = (soloPendientes = true) => {
  const q = db().from('mantenciones').select('*').order('programada_el')
  return soloPendientes ? q.eq('estado', 'programada') : q
}

export const consultarMantencionesDe = (clienteId: string) =>
  db().from('mantenciones').select('*').eq('cliente_id', clienteId).order('programada_el')

export const crearMantencion = (mantencion: Partial<Mantencion>) =>
  db().from('mantenciones').insert(mantencion).select().single()

export const guardarMantencion = (id: string, cambios: Partial<Mantencion>) =>
  db()
    .from('mantenciones')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)

export const borrarMantencion = (id: string) => db().from('mantenciones').delete().eq('id', id)

/**
 * Cerrar una mantención y dejar agendada la siguiente.
 *
 * Es el motor del ingreso recurrente: si la próxima visita no queda agendada en
 * el momento de cerrar la anterior, no la agenda nadie. Por eso la repetición
 * ocurre aquí y no en una pantalla aparte que haya que acordarse de abrir.
 *
 * También se actualiza `ultima_mantencion` del equipo, que es lo que después
 * permite mirar una máquina y saber cuándo se tocó por última vez.
 */
export async function cerrarMantencion(
  mantencion: Mantencion,
  realizadaEl: string,
  nota?: string,
) {
  await guardarMantencion(mantencion.id, {
    estado: 'hecha',
    realizada_el: realizadaEl,
    nota: nota?.trim() || mantencion.nota,
  })

  if (mantencion.equipo_id) {
    await db()
      .from('equipos')
      .update({ ultima_mantencion: realizadaEl })
      .eq('id', mantencion.equipo_id)
  }

  if (!mantencion.frecuencia_meses) return null

  const siguiente = new Date(realizadaEl + 'T12:00:00')
  siguiente.setMonth(siguiente.getMonth() + mantencion.frecuencia_meses)
  const fecha = new Date(siguiente.getTime() - siguiente.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  const { data } = await crearMantencion({
    cliente_id: mantencion.cliente_id,
    equipo_id: mantencion.equipo_id,
    contrato_id: mantencion.contrato_id,
    tecnico_id: mantencion.tecnico_id,
    programada_el: fecha,
    frecuencia_meses: mantencion.frecuencia_meses,
    titulo: mantencion.titulo,
    estado: 'programada',
  })
  return data as Mantencion | null
}

/* ── Informes de cierre ─────────────────────────────────────────────────── */

export const consultarInformes = () =>
  db().from('informes').select('*').order('fecha', { ascending: false })

export const consultarInforme = (id: string) =>
  db().from('informes').select('*').eq('id', id).single()

export const crearInforme = (informe: Partial<Informe>) =>
  db().from('informes').insert(informe).select().single()

export const guardarInforme = (id: string, cambios: Partial<Informe>) =>
  db()
    .from('informes')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)

export const borrarInforme = (id: string) => db().from('informes').delete().eq('id', id)

/** Los informes siguen la numeración de la empresa: AAAA-NNN. */
export async function siguienteNumeroInforme(): Promise<string> {
  const anio = new Date().getFullYear()
  const { data } = await db()
    .from('informes')
    .select('numero')
    .like('numero', `${anio}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const ultimo = data?.[0]?.numero as string | undefined
  const correlativo = ultimo ? Number(ultimo.split('-')[1]) + 1 : 1
  return `${anio}-${String(correlativo).padStart(3, '0')}`
}

export const consultarInformeEquipos = (informeId: string) =>
  db().from('informe_equipos').select('*').eq('informe_id', informeId).order('orden')

export const crearInformeEquipo = (bloque: Partial<InformeEquipo>) =>
  db().from('informe_equipos').insert(bloque).select().single()

export const guardarInformeEquipo = (id: string, cambios: Partial<InformeEquipo>) =>
  db().from('informe_equipos').update(cambios).eq('id', id)

export const borrarInformeEquipo = (id: string) =>
  db().from('informe_equipos').delete().eq('id', id)

export const consultarHallazgos = (informeId: string) =>
  db().from('informe_hallazgos').select('*').eq('informe_id', informeId).order('creado_en')

export const crearHallazgo = (hallazgo: Partial<Hallazgo>) =>
  db().from('informe_hallazgos').insert(hallazgo).select().single()

export const guardarHallazgo = (id: string, cambios: Partial<Hallazgo>) =>
  db().from('informe_hallazgos').update(cambios).eq('id', id)

export const borrarHallazgo = (id: string) =>
  db().from('informe_hallazgos').delete().eq('id', id)

export const consultarMateriales = (informeId: string) =>
  db().from('informe_materiales').select('*').eq('informe_id', informeId)

export const crearMaterial = (material: Partial<MaterialInforme>) =>
  db().from('informe_materiales').insert(material).select().single()

export const borrarMaterial = (id: string) =>
  db().from('informe_materiales').delete().eq('id', id)

export const consultarFotos = (informeId: string) =>
  db().from('informe_fotos').select('*').eq('informe_id', informeId).order('orden')

export const crearFoto = (foto: Partial<FotoInforme>) =>
  db().from('informe_fotos').insert(foto).select().single()

export const borrarFotoFila = (id: string) => db().from('informe_fotos').delete().eq('id', id)

/**
 * Emitir el informe: se cierra, y lo que arrastra se mueve solo.
 *
 * Los consumibles que se usaron bajan del inventario —quedan en «se acabó»
 * cuando no queda nada registrado—, y si el informe venía de una mantención
 * programada, esa mantención queda cerrada con su siguiente ya agendada. Hacer
 * estas tres cosas en pantallas separadas garantizaba que dos se olvidaran.
 */
export async function emitirInforme(
  informe: Informe,
  materiales: MaterialInforme[],
  mantencion?: Mantencion | null,
) {
  await guardarInforme(informe.id, { estado: 'emitido' })

  for (const m of materiales.filter(x => x.insumo_id)) {
    const { data } = await db()
      .from('existencias')
      .select('id, cantidad')
      .eq('insumo_id', m.insumo_id as string)
      .is('tecnico_id', null)
      .maybeSingle()
    if (!data) continue
    const fila = data as { id: string; cantidad: number }
    const queda = Math.max(0, Number(fila.cantidad) - Number(m.cantidad))
    await db()
      .from('existencias')
      .update({
        cantidad: queda,
        estado: queda === 0 ? 'agotado' : 'tiene',
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', fila.id)
  }

  if (mantencion && mantencion.estado === 'programada') {
    return cerrarMantencion(mantencion, informe.fecha, informe.resumen ?? undefined)
  }
  return null
}

/* ── Documentos con vencimiento ─────────────────────────────────────────── */

export const consultarDocumentos = (incluirArchivados = false) => {
  const q = db().from('documentos').select('*').order('vence_el', { nullsFirst: false })
  return incluirArchivados ? q : q.eq('archivado', false)
}

export const crearDocumento = (documento: Partial<Documento>) =>
  db().from('documentos').insert(documento).select().single()

export const guardarDocumento = (id: string, cambios: Partial<Documento>) =>
  db()
    .from('documentos')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)

export const borrarDocumento = (id: string) => db().from('documentos').delete().eq('id', id)

/**
 * La historia de una máquina: cada vez que apareció en un informe.
 *
 * Es lo que permite decir «el consumo pasó de 7,2 A en abril a 9,4 A hoy», que
 * convence a un cliente mucho mejor que una opinión. Se trae el informe junto
 * en la misma consulta para no hacer una por fila.
 */
export const historialEquipo = (equipoId: string) =>
  db()
    .from('informe_equipos')
    .select('*, informe:informes(id, numero, fecha, tipo, estado, creado_en)')
    .eq('equipo_id', equipoId)
    .order('id')

export const consultarEquipo = (id: string) =>
  db().from('equipos').select('*').eq('id', id).single()

/* ── Caja ───────────────────────────────────────────────────────────────── */

export const consultarMovimientos = (desde?: string, hasta?: string) => {
  let q = db().from('movimientos').select('*').order('fecha', { ascending: false })
  if (desde) q = q.gte('fecha', desde)
  if (hasta) q = q.lte('fecha', hasta)
  return q
}

/** Lo que está por cobrar o por pagar, venga del mes que venga. */
export const consultarPendientes = () =>
  db().from('movimientos').select('*').eq('estado', 'pendiente').order('vence_el')

export const crearMovimiento = (movimiento: Partial<Movimiento>) =>
  db().from('movimientos').insert(movimiento).select().single()

export const guardarMovimiento = (id: string, cambios: Partial<Movimiento>) =>
  db()
    .from('movimientos')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', id)

export const borrarMovimiento = (id: string) => db().from('movimientos').delete().eq('id', id)

/* ── Buscar en todo ─────────────────────────────────────────────────────── */

export interface Hallado {
  tipo: 'prospecto' | 'cliente' | 'negocio' | 'presupuesto' | 'informe' | 'proveedor' | 'insumo'
  id: string
  titulo: string
  detalle: string | null
  ruta: string
}

/**
 * Un nombre, buscado en todas partes.
 *
 * Cada pantalla tiene su propio buscador, y eso sirve cuando uno ya sabe dónde
 * está la cosa. En la calle pasa al revés: se acuerda del nombre del local y
 * no de si quedó como prospecto, como cliente o como presupuesto.
 *
 * Las comas y los porcentajes se sacan del texto: son la sintaxis del filtro
 * de PostgREST y colarlas rompe la consulta entera.
 */
export async function buscarEnTodo(texto: string): Promise<Hallado[]> {
  const limpio = texto.trim().replace(/[,%]/g, ' ').trim()
  if (limpio.length < 2) return []
  const like = `%${limpio}%`

  const [prospectos, clientes, negocios, presupuestos, informes, proveedores, insumos] =
    await Promise.all([
      db().from('prospectos').select('id, nombre, rubro, direccion')
        .or(`nombre.ilike.${like},direccion.ilike.${like}`).limit(8),
      db().from('clientes').select('id, nombre, direccion')
        .or(`nombre.ilike.${like},direccion.ilike.${like}`).limit(8),
      db().from('oportunidades').select('id, titulo, etapa').ilike('titulo', like).limit(5),
      db().from('presupuestos').select('id, numero, titulo')
        .or(`titulo.ilike.${like},numero.ilike.${like}`).limit(5),
      db().from('informes').select('id, numero, tipo').ilike('numero', like).limit(5),
      db().from('proveedores').select('id, nombre, rubro').ilike('nombre', like).limit(5),
      db().from('catalogo_insumos').select('id, nombre, codigo, categoria')
        .or(`nombre.ilike.${like},codigo.ilike.${like}`).limit(6),
    ])

  const hallados: Hallado[] = []
  const agregar = (
    filas: unknown[] | null,
    tipo: Hallado['tipo'],
    arma: (f: Record<string, string>) => Omit<Hallado, 'tipo'>,
  ) => {
    for (const f of (filas ?? []) as Record<string, string>[]) {
      hallados.push({ tipo, ...arma(f) })
    }
  }

  agregar(prospectos.data, 'prospecto', f => ({
    id: f.id, titulo: f.nombre, detalle: [f.rubro, f.direccion].filter(Boolean).join(' · ') || null,
    ruta: `/prospectos/${f.id}`,
  }))
  agregar(clientes.data, 'cliente', f => ({
    id: f.id, titulo: f.nombre, detalle: f.direccion ?? null, ruta: `/clientes/${f.id}`,
  }))
  agregar(negocios.data, 'negocio', f => ({
    id: f.id, titulo: f.titulo, detalle: f.etapa ?? null, ruta: '/negocios',
  }))
  agregar(presupuestos.data, 'presupuesto', f => ({
    id: f.id, titulo: f.titulo ?? 'Presupuesto', detalle: f.numero ?? null,
    ruta: `/presupuestos/${f.id}`,
  }))
  agregar(informes.data, 'informe', f => ({
    id: f.id, titulo: `Informe ${f.numero ?? ''}`.trim(), detalle: f.tipo ?? null,
    ruta: `/informes/${f.id}`,
  }))
  agregar(proveedores.data, 'proveedor', f => ({
    id: f.id, titulo: f.nombre, detalle: f.rubro ?? null, ruta: '/proveedores',
  }))
  agregar(insumos.data, 'insumo', f => ({
    id: f.id, titulo: f.nombre, detalle: [f.codigo, f.categoria].filter(Boolean).join(' · '),
    ruta: '/inventario',
  }))

  return hallados
}
