import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Buscador, Campo, Cargando, Hoja, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import { consultarClientes, crearCliente, useConsulta } from '../lib/datos'
import type { Cliente } from '../lib/tipos'

export function Clientes() {
  const [busqueda, setBusqueda] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const { datos, cargando, recargar } = useConsulta<Cliente[]>(
    () => consultarClientes(busqueda || undefined),
    [busqueda],
  )

  async function agregar() {
    if (!nombre.trim()) return
    await crearCliente({ nombre: nombre.trim(), direccion: direccion || null, telefono: telefono || null })
    setNombre('')
    setDireccion('')
    setTelefono('')
    setAbierta(false)
    void recargar()
  }

  const lista = datos ?? []

  return (
    <Pantalla
      titulo="Clientes"
      bajada={cargando ? undefined : `${lista.length} en cartera`}
      accion={
        <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Agregar cliente">
          <IconoAgregar />
        </Boton>
      }
    >
      <Buscador valor={busqueda} alCambiar={setBusqueda} marcador="Buscar cliente" />

      <div className="mt-4">
        {cargando ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio texto="Todavía no hay clientes. Se crean desde un prospecto o con el botón de arriba." />
        ) : (
          <ul className="space-y-2">
            {lista.map(c => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`}>
                  <Tarjeta className="p-3">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="truncate text-sm text-mut">
                      {[c.direccion, c.comuna].filter(Boolean).join(', ') || 'Sin dirección'}
                    </p>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Hoja abierta={abierta} titulo="Nuevo cliente" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Campo etiqueta="Nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} />
          <Campo etiqueta="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
          <Campo etiqueta="Teléfono" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Boton onClick={() => setAbierta(false)}>Cancelar</Boton>
            <Boton variante="acento" onClick={agregar}>Guardar</Boton>
          </div>
        </div>
      </Hoja>
    </Pantalla>
  )
}
