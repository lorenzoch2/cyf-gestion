import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import { Boton, Cifra, Panel, Rotulo, Tarjeta } from '../componentes/ui'
import { Marca } from '../componentes/Marca'
import {
  IconoBuscar, IconoCaja, IconoClientes, IconoCompras, IconoDocumentos, IconoEquipo, IconoFlecha,
  IconoGuia, IconoHoy, IconoInforme, IconoInventario, IconoLocal, IconoMantencion, IconoMapa,
  IconoNegocios,
  IconoPendientes, IconoPresupuesto, IconoRuta, IconoTarifario,
} from '../componentes/iconos'
import { useSesion } from '../lib/sesion'
import {
  consultarCatalogo, consultarDocumentos, consultarExistencias, consultarMantenciones, useConsulta,
} from '../lib/datos'
import { diasHasta } from '../lib/formato'
import type { Documento, Existencia, Insumo, Mantencion } from '../lib/tipos'

/*
  La portada.

  La barra de abajo lleva a las cuatro pantallas que se abren todos los días;
  esta pantalla es la que tiene que crecer cuando aparezca un módulo nuevo, sin
  que haya que inventar dónde ponerlo. Por eso va agrupada por momento de uso y
  no por orden de llegada.

  Antes eran veinte tarjetas del mismo alto, el mismo blanco y la misma flecha
  gris: para encontrar «Documentos» había que leerlas todas y bajar cuatro
  pantallas. Ahora cada módulo tiene su icono —la mano aprende dónde está y deja
  de leer—, las filas son la mitad de altas y arriba va el panel con lo que está
  esperando, que es la razón por la que uno abre la app sin saber qué buscaba.
*/
interface Modulo {
  a: string
  titulo: string
  detalle: string
  Icono: ComponentType
}

const GRUPOS: { titulo: string; items: Modulo[] }[] = [
  {
    titulo: 'El día',
    items: [
      { a: '/hoy', titulo: 'Hoy', detalle: 'Lo que toca, lo que vence y lo que se movió', Icono: IconoHoy },
      { a: '/tareas', titulo: 'Pendientes', detalle: 'Lo que hay que hacer y cuándo vence', Icono: IconoPendientes },
      { a: '/mapa', titulo: 'Mapa', detalle: 'Los locales por color de estado, y el recorrido', Icono: IconoMapa },
      { a: '/rutas', titulo: 'Rutas', detalle: 'Los locales que se caminan en una tarde', Icono: IconoRuta },
      { a: '/guia', titulo: 'Guía', detalle: 'Qué decir en la puerta, y cómo se usa la app', Icono: IconoGuia },
    ],
  },
  {
    titulo: 'Comercial',
    items: [
      { a: '/prospectos', titulo: 'Prospectos', detalle: 'Los locales por visitar y su gestión', Icono: IconoLocal },
      { a: '/clientes', titulo: 'Clientes', detalle: 'Fichas, equipos y contratos', Icono: IconoClientes },
      { a: '/negocios', titulo: 'Negocios', detalle: 'Las oportunidades abiertas', Icono: IconoNegocios },
      { a: '/presupuestos', titulo: 'Presupuestos', detalle: 'Armar y seguir las cotizaciones', Icono: IconoPresupuesto },
      { a: '/tarifario', titulo: 'Tarifario', detalle: 'Precios por equipo y servicios adicionales', Icono: IconoTarifario },
    ],
  },
  {
    titulo: 'Plata',
    items: [
      { a: '/caja', titulo: 'Caja', detalle: 'Lo que entra, lo que sale y el IVA del mes', Icono: IconoCaja },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { a: '/mantenciones', titulo: 'Mantenciones', detalle: 'Las visitas programadas y lo atrasado', Icono: IconoMantencion },
      { a: '/informes', titulo: 'Informes de cierre', detalle: 'El trabajo medido y documentado, con firma', Icono: IconoInforme },
      { a: '/inventario', titulo: 'Inventario', detalle: 'Qué hay, qué falta y qué se acabó', Icono: IconoInventario },
      { a: '/compras', titulo: 'Compras', detalle: 'Órdenes de compra y proveedores', Icono: IconoCompras },
      { a: '/equipo', titulo: 'Equipo', detalle: 'Las personas y su dotación', Icono: IconoEquipo },
      { a: '/documentos', titulo: 'Documentos', detalle: 'Lo que caduca: patente, seguros, certificaciones', Icono: IconoDocumentos },
    ],
  },
]

export function Menu() {
  const { sesion, salir } = useSesion()

  /*
    Los tres números que tienen que venir a buscarte.

    Un módulo que hay que acordarse de abrir no avisa de nada: lo que vence se
    vence igual. Por eso la portada carga estas tres cuentas y las pone arriba,
    en el panel, antes que cualquier módulo.
  */
  const catalogo = useConsulta<Insumo[]>(() => consultarCatalogo(), [])
  const existencias = useConsulta<Existencia[]>(() => consultarExistencias(), [])
  const mantenciones = useConsulta<Mantencion[]>(() => consultarMantenciones(true), [])
  const documentos = useConsulta<Documento[]>(() => consultarDocumentos(), [])

  /*
    El aviso del inventario cuenta lo que hay que conseguir, no todo lo que
    falta por registrar.

    Un ítem sin fila de existencia es «falta» por omisión, y la primera vuelta
    por el taller deja decenas así: un aviso de «132 por reponer» en la portada
    se vuelve ruido y se deja de mirar a la semana. Lo que exige acción es lo
    crítico que no está —sin recuperadora no se trabaja dentro de norma— y lo
    que se acabó de verdad.
  */
  const tiene = new Set(
    (existencias.datos ?? []).filter(e => e.estado === 'tiene').map(e => e.insumo_id),
  )
  const agotados = (existencias.datos ?? []).filter(e => e.estado === 'agotado').length
  const criticos = (catalogo.datos ?? []).filter(c => c.critico && !tiene.has(c.id)).length
  const conseguir = criticos + agotados

  const atrasadas = (mantenciones.datos ?? []).filter(
    m => (diasHasta(m.programada_el) ?? 0) < 0,
  ).length

  const porVencer = (documentos.datos ?? []).filter(d => {
    if (!d.vence_el) return false
    const dias = diasHasta(d.vence_el) ?? 0
    return dias <= d.aviso_dias
  }).length

  const esperando: { a: string; n: number; que: string }[] = [
    { a: '/inventario', n: conseguir, que: conseguir === 1 ? 'por conseguir' : 'por conseguir' },
    { a: '/mantenciones', n: atrasadas, que: atrasadas === 1 ? 'atrasada' : 'atrasadas' },
    { a: '/documentos', n: porVencer, que: porVencer === 1 ? 'por renovar' : 'por renovar' },
  ]
  const cargandoPanel =
    catalogo.cargando || existencias.cargando || mantenciones.cargando || documentos.cargando
  const nadaEsperando = !cargandoPanel && esperando.every(e => e.n === 0)

  /* El aviso al lado del nombre del módulo, para quien baja hasta la fila. */
  const avisos: Record<string, string> = {}
  if (conseguir > 0) {
    avisos['/inventario'] =
      criticos > 0 && agotados > 0
        ? `${criticos} críticos · ${agotados} agotados`
        : criticos > 0
          ? `${criticos} críticos`
          : `${agotados} agotados`
  }
  if (atrasadas > 0) avisos['/mantenciones'] = `${atrasadas} atrasadas`
  if (porVencer > 0) avisos['/documentos'] = `${porVencer} por renovar`

  return (
    <div className="min-h-full">
      {/* El encabezado de la portada no es el de las demás pantallas: acá la
          marca se muestra entera, porque es la primera pantalla del día. */}
      <header className="sobre-seguro mx-auto max-w-lg px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <Marca tamano={34} />
          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-laton-dk">
              Calor y Frío Industrial
            </p>
            <h1 className="text-[1.4rem] font-semibold leading-tight tracking-tight">Gestión</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28">
        {/* Lo que está esperando. Va antes que los módulos porque es la razón
            por la que uno abre la app sin saber qué venía a buscar. */}
        <Panel className="px-4 py-3.5">
          <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-faint">
            Esperando
          </p>
          {nadaEsperando ? (
            <p className="mt-2 text-sm text-linea-2">
              Nada vencido ni por reponer. La bodega y los papeles al día.
            </p>
          ) : (
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {esperando.map(({ a, n, que }) => (
                <Link key={a} to={a} className="block rounded-lg px-1 py-0.5 active:bg-panel-2">
                  <Cifra tono={n > 0 ? 'laton' : 'mut'}>{cargandoPanel ? '—' : n}</Cifra>
                  <span className="mt-1 block text-[0.72rem] leading-tight text-faint">{que}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Link to="/buscar" className="mt-3 block">
          <Tarjeta className="flex items-center gap-2.5 px-3 py-2.5 text-mut">
            <IconoBuscar />
            <span className="text-sm">Buscar en todo</span>
          </Tarjeta>
        </Link>

        <div className="mt-6 space-y-5">
          {GRUPOS.map(grupo => (
            <section key={grupo.titulo}>
              <Rotulo className="mb-2 px-1">{grupo.titulo}</Rotulo>
              {/* Un solo bloque con separadores, no una tarjeta por fila: el
                  grupo se lee como una unidad y ahorra la mitad del alto. */}
              <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-carta">
                {grupo.items.map((item, i) => (
                  <Link
                    key={item.a}
                    to={item.a}
                    className={`flex items-center gap-3 px-3.5 py-3 active:bg-tinte ${
                      i > 0 ? 'border-t border-linea' : ''
                    }`}
                  >
                    <span className="shrink-0 text-acero">
                      <item.Icono />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium leading-tight">
                        <span className="truncate">{item.titulo}</span>
                        {avisos[item.a] && (
                          <span className="shrink-0 rounded bg-naranja/12 px-1.5 py-0.5 font-mono text-[0.66rem] font-medium text-naranja">
                            {avisos[item.a]}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[0.8rem] leading-tight text-mut">
                        {item.detalle}
                      </p>
                    </div>
                    <span className="shrink-0 text-linea-2">
                      <IconoFlecha />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm text-mut">Sesión de {sesion?.user.email}</p>
          <Boton className="mt-2 w-full" onClick={() => void salir()}>
            Cerrar sesión
          </Boton>
        </div>
      </main>
    </div>
  )
}
