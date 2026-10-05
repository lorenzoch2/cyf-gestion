import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Navegacion } from './componentes/Navegacion'
import { Cargando } from './componentes/ui'
import { useSesion } from './lib/sesion'
import { hayConfiguracion } from './lib/supabase'
import { Entrar } from './paginas/Entrar'
import { Configuracion } from './paginas/Configuracion'
import { Hoy } from './paginas/Hoy'
import { Prospectos } from './paginas/Prospectos'
import { ProspectoDetalle } from './paginas/ProspectoDetalle'
import { Clientes } from './paginas/Clientes'
import { ClienteDetalle } from './paginas/ClienteDetalle'
import { Negocios } from './paginas/Negocios'
import { Tareas } from './paginas/Tareas'
import { Tarifario } from './paginas/Tarifario'
import { Rutas } from './paginas/Rutas'
import { Presupuestos } from './paginas/Presupuestos'
import { PresupuestoDetalle } from './paginas/PresupuestoDetalle'
import { Mas } from './paginas/Mas'

/*
  El mapa arrastra Leaflet: unos 150 KB que no tienen por qué viajar cuando
  se abre la app para mirar un pendiente. Se carga al entrar a la pantalla.
*/
const Mapa = lazy(() => import('./paginas/Mapa').then(m => ({ default: m.Mapa })))

export function App() {
  const { sesion, cargando } = useSesion()

  if (!hayConfiguracion) return <Configuracion />
  if (cargando) return <Cargando />
  if (!sesion) return <Entrar />

  return (
    <>
      <Routes>
        <Route path="/" element={<Hoy />} />
        <Route path="/prospectos" element={<Prospectos />} />
        <Route path="/prospectos/:id" element={<ProspectoDetalle />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route path="/negocios" element={<Negocios />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/rutas" element={<Rutas />} />
        <Route
          path="/mapa"
          element={
            <Suspense fallback={<Cargando />}>
              <Mapa />
            </Suspense>
          }
        />
        <Route path="/tarifario" element={<Tarifario />} />
        <Route path="/presupuestos" element={<Presupuestos />} />
        <Route path="/presupuestos/:id" element={<PresupuestoDetalle />} />
        <Route path="/mas" element={<Mas />} />
        <Route path="*" element={<Hoy />} />
      </Routes>
      <Navegacion />
    </>
  )
}
