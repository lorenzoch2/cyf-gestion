import { NavLink } from 'react-router-dom'
import { IconoClientes, IconoHoy, IconoMapa, IconoMas, IconoNegocios } from './iconos'

/*
  Cinco destinos y no más: son los que caben bajo el pulgar. El menú de la
  portada es el que crece cuando aparece un módulo nuevo.
*/
const ENLACES = [
  { a: '/', texto: 'Menú', Icono: IconoMas, exacto: true },
  { a: '/hoy', texto: 'Hoy', Icono: IconoHoy },
  { a: '/prospectos', texto: 'Prospectos', Icono: IconoMapa },
  { a: '/clientes', texto: 'Clientes', Icono: IconoClientes },
  { a: '/negocios', texto: 'Negocios', Icono: IconoNegocios },
]

/** Barra inferior: el pulgar llega ahí sin mover la mano. */
export function Navegacion() {
  return (
    <nav className="bajo-seguro fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {ENLACES.map(({ a, texto, Icono, exacto }) => (
          <li key={a} className="flex-1">
            <NavLink
              to={a}
              end={exacto}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 pb-1 pt-2 text-[0.68rem] ${
                  isActive ? 'text-laton-dk' : 'text-mut'
                }`
              }
            >
              <Icono />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
