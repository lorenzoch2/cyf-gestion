import { Link } from 'react-router-dom'
import { Boton, Pantalla, Tarjeta } from '../componentes/ui'
import { IconoFlecha } from '../componentes/iconos'
import { useSesion } from '../lib/sesion'
import {
  consultarDocumentos, consultarExistencias, consultarMantenciones, useConsulta,
} from '../lib/datos'
import { diasHasta } from '../lib/formato'
import type { Documento, Existencia, Mantencion } from '../lib/tipos'

/*
  La portada.

  La barra de abajo lleva a las cuatro pantallas que se abren todos los días;
  esta pantalla es la que tiene que crecer cuando aparezca un módulo nuevo, sin
  que haya que inventar dónde ponerlo. Por eso va agrupada por momento de uso y
  no por orden de llegada.
*/
const GRUPOS: { titulo: string; items: { a: string; titulo: string; detalle: string }[] }[] = [
  {
    titulo: 'El día',
    items: [
      { a: '/hoy', titulo: 'Hoy', detalle: 'Lo que toca, lo que vence y lo que se movió' },
      { a: '/tareas', titulo: 'Pendientes', detalle: 'Lo que hay que hacer y cuándo vence' },
      { a: '/mapa', titulo: 'Mapa', detalle: 'Los locales por color de estado, y el recorrido' },
      { a: '/rutas', titulo: 'Rutas', detalle: 'Los locales que se caminan en una tarde' },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      { a: '/prospectos', titulo: 'Prospectos', detalle: 'Los locales por visitar y su gestión' },
      { a: '/clientes', titulo: 'Clientes', detalle: 'Fichas, equipos y contratos' },
      { a: '/negocios', titulo: 'Negocios', detalle: 'Las oportunidades abiertas' },
      { a: '/presupuestos', titulo: 'Presupuestos', detalle: 'Armar y seguir las cotizaciones' },
      { a: '/tarifario', titulo: 'Tarifario', detalle: 'Precios por equipo y servicios adicionales' },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { a: '/mantenciones', titulo: 'Mantenciones', detalle: 'Las visitas programadas y lo que está atrasado' },
      { a: '/informes', titulo: 'Informes de cierre', detalle: 'El trabajo medido y documentado, con firma' },
      { a: '/inventario', titulo: 'Inventario', detalle: 'Qué hay, qué falta y qué se acabó' },
      { a: '/compras', titulo: 'Compras', detalle: 'Órdenes de compra y proveedores' },
      { a: '/equipo', titulo: 'Equipo', detalle: 'Las personas y su dotación' },
      { a: '/documentos', titulo: 'Documentos', detalle: 'Lo que caduca: patente, seguros, certificaciones' },
    ],
  },
]

export function Menu() {
  const { sesion, salir } = useSesion()

  /*
    Los tres números que tienen que venir a buscarte.

    Un módulo que hay que acordarse de abrir no avisa de nada: lo que vence se
    vence igual. Por eso la portada carga estas tres cuentas y las muestra al
    lado del nombre.
  */
  const existencias = useConsulta<Existencia[]>(() => consultarExistencias(), [])
  const mantenciones = useConsulta<Mantencion[]>(() => consultarMantenciones(true), [])
  const documentos = useConsulta<Documento[]>(() => consultarDocumentos(), [])

  const avisos: Record<string, string> = {}

  const faltan = (existencias.datos ?? []).filter(
    e => e.estado === 'falta' || e.estado === 'agotado',
  ).length
  if (faltan > 0) avisos['/inventario'] = `${faltan} por reponer`

  const atrasadas = (mantenciones.datos ?? []).filter(
    m => (diasHasta(m.programada_el) ?? 0) < 0,
  ).length
  if (atrasadas > 0) avisos['/mantenciones'] = `${atrasadas} atrasadas`

  const porVencer = (documentos.datos ?? []).filter(d => {
    if (!d.vence_el) return false
    const dias = diasHasta(d.vence_el) ?? 0
    return dias <= d.aviso_dias
  }).length
  if (porVencer > 0) avisos['/documentos'] = `${porVencer} por renovar`

  return (
    <Pantalla titulo="Gestión" bajada="Calor y Frío Industrial">
      <div className="space-y-6">
        {GRUPOS.map(grupo => (
          <section key={grupo.titulo}>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
              {grupo.titulo}
            </h2>
            <ul className="space-y-2">
              {grupo.items.map(item => (
                <li key={item.a}>
                  <Link to={item.a}>
                    <Tarjeta className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {item.titulo}
                          {avisos[item.a] && (
                            <span className="ml-2 rounded bg-naranja/12 px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-naranja">
                              {avisos[item.a]}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-sm text-mut">{item.detalle}</p>
                      </div>
                      <span className="shrink-0 text-faint">
                        <IconoFlecha />
                      </span>
                    </Tarjeta>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-sm text-mut">Sesión de {sesion?.user.email}</p>
        <Boton className="mt-2 w-full" onClick={() => void salir()}>
          Cerrar sesión
        </Boton>
      </div>
    </Pantalla>
  )
}
