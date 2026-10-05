import { Link } from 'react-router-dom'
import { Boton, Pantalla, Tarjeta } from '../componentes/ui'
import { IconoFlecha } from '../componentes/iconos'
import { useSesion } from '../lib/sesion'

const SECCIONES = [
  { a: '/tareas', titulo: 'Pendientes', detalle: 'Lo que hay que hacer y cuándo vence' },
  { a: '/mapa', titulo: 'Mapa', detalle: 'Los locales en el mapa, por color de estado' },
  { a: '/rutas', titulo: 'Rutas', detalle: 'Los locales que se caminan en una tarde' },
  { a: '/tarifario', titulo: 'Tarifario', detalle: 'Precios por equipo y servicios adicionales' },
  { a: '/presupuestos', titulo: 'Presupuestos', detalle: 'Armar y seguir las cotizaciones' },
]

export function Mas() {
  const { sesion, salir } = useSesion()
  return (
    <Pantalla titulo="Más">
      <ul className="space-y-2">
        {SECCIONES.map(s => (
          <li key={s.a}>
            <Link to={s.a}>
              <Tarjeta className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{s.titulo}</p>
                  <p className="text-sm text-mut">{s.detalle}</p>
                </div>
                <span className="text-faint">
                  <IconoFlecha />
                </span>
              </Tarjeta>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <p className="text-sm text-mut">Sesión de {sesion?.user.email}</p>
        <Boton className="mt-2 w-full" onClick={() => void salir()}>
          Cerrar sesión
        </Boton>
      </div>
    </Pantalla>
  )
}
