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
import { Presupuestos } from './paginas/Presupuestos'
import { PresupuestoDetalle } from './paginas/PresupuestoDetalle'
import { Mas } from './paginas/Mas'

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
