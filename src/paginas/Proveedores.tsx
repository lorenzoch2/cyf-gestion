import { useState } from 'react'
import {
  Area, Boton, Buscador, Campo, Cargando, Hoja, Pantalla, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoTelefono } from '../componentes/iconos'
import { consultarProveedores, crearProveedor, guardarProveedor, useConsulta } from '../lib/datos'
import { enlaceLlamada } from '../lib/formato'
import type { Proveedor } from '../lib/tipos'

/*
  Los proveedores.

  Lo que no es obvio y por eso tiene campo propio: cuántos días dura una
  cotización suya. un distribuidor cotiza a tres días corridos, y un presupuesto al
  cliente con 30 días de validez apoyado en ese precio es una pérdida esperando
  ocurrir. La app lo recuerda para que no haya que acordarse.
*/
export function Proveedores() {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const { datos, cargando, recargar } = useConsulta<Proveedor[]>(() => consultarProveedores(), [])

  const texto = busqueda.trim().toLowerCase()
  const visibles = (datos ?? []).filter(
    p => !texto || (p.nombre + ' ' + (p.rubro ?? '')).toLowerCase().includes(texto),
  )

  return (
    <Pantalla
      titulo="Proveedores"
      bajada={cargando ? 'Cargando…' : `${visibles.length} en la lista`}
      volver
      accion={
        <Boton className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Agregar
        </Boton>
      }
    >
      <Buscador valor={busqueda} alCambiar={setBusqueda} marcador="Buscar proveedor" />

      {cargando ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <Vacio texto="Todavía no hay proveedores. Cárgalos una vez y después las cotizaciones del inventario se les asignan solas." />
      ) : (
        <ul className="mt-4 space-y-2">
          {visibles.map(p => (
            <li key={p.id}>
              <Tarjeta className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.nombre}
                      {!p.activo && <span className="ml-2 text-xs text-faint">inactivo</span>}
                    </p>
                    <p className="truncate text-sm text-mut">{p.rubro ?? 'Sin rubro'}</p>
                  </div>
                  <button
                    onClick={() => setEditando(p)}
                    className="shrink-0 text-sm font-medium text-acero-dk"
                  >
                    Editar
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-faint">
                  {p.validez_dias !== null && (
                    <span className="text-laton-dk">cotiza a {p.validez_dias} días</span>
                  )}
                  {p.comuna && <span>{p.comuna}</span>}
                  {p.telefono && (
                    <a
                      href={enlaceLlamada(p.telefono) ?? '#'}
                      className="flex items-center gap-1 text-acero-dk"
                    >
                      <IconoTelefono />
                      {p.telefono}
                    </a>
                  )}
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}

      <FichaProveedor
        proveedor={editando}
        abierta={nuevo || editando !== null}
        alCerrar={() => {
          setNuevo(false)
          setEditando(null)
        }}
        alGuardar={() => void recargar()}
      />
    </Pantalla>
  )
}

function FichaProveedor({
  proveedor,
  abierta,
  alCerrar,
  alGuardar,
}: {
  proveedor: Proveedor | null
  abierta: boolean
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [clave, setClave] = useState('nuevo')
  const [campos, setCampos] = useState({
    nombre: '', rubro: '', rut: '', contacto: '', telefono: '', email: '',
    direccion: '', comuna: '', condiciones: '', validez: '', nota: '',
  })

  // El formulario es uno solo: al abrir otra ficha hay que recargarlo.
  if (clave !== (proveedor?.id ?? 'nuevo')) {
    setClave(proveedor?.id ?? 'nuevo')
    setCampos({
      nombre: proveedor?.nombre ?? '',
      rubro: proveedor?.rubro ?? '',
      rut: proveedor?.rut ?? '',
      contacto: proveedor?.contacto ?? '',
      telefono: proveedor?.telefono ?? '',
      email: proveedor?.email ?? '',
      direccion: proveedor?.direccion ?? '',
      comuna: proveedor?.comuna ?? '',
      condiciones: proveedor?.condiciones ?? '',
      validez: proveedor?.validez_dias !== null && proveedor?.validez_dias !== undefined
        ? String(proveedor.validez_dias)
        : '',
      nota: proveedor?.nota ?? '',
    })
  }

  function cambiar(campo: keyof typeof campos) {
    return (e: { target: { value: string } }) =>
      setCampos(c => ({ ...c, [campo]: e.target.value }))
  }

  async function guardar() {
    if (!campos.nombre.trim()) return
    const datos: Partial<Proveedor> = {
      nombre: campos.nombre.trim(),
      rubro: campos.rubro.trim() || null,
      rut: campos.rut.trim() || null,
      contacto: campos.contacto.trim() || null,
      telefono: campos.telefono.trim() || null,
      email: campos.email.trim() || null,
      direccion: campos.direccion.trim() || null,
      comuna: campos.comuna.trim() || null,
      condiciones: campos.condiciones.trim() || null,
      validez_dias: campos.validez ? Number(campos.validez) : null,
      nota: campos.nota.trim() || null,
    }
    if (proveedor) await guardarProveedor(proveedor.id, datos)
    else await crearProveedor(datos)
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja
      abierta={abierta}
      titulo={proveedor ? 'Editar proveedor' : 'Agregar proveedor'}
      alCerrar={alCerrar}
    >
      <div className="space-y-3">
        <Campo etiqueta="Nombre" autoFocus value={campos.nombre} onChange={cambiar('nombre')} />
        <Campo
          etiqueta="Rubro"
          value={campos.rubro}
          onChange={cambiar('rubro')}
          placeholder="Equipos, repuestos, gases, ferretería"
        />
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="R.U.T." value={campos.rut} onChange={cambiar('rut')} />
          <Campo
            etiqueta="Teléfono"
            type="tel"
            value={campos.telefono}
            onChange={cambiar('telefono')}
          />
        </div>
        <Campo etiqueta="Contacto" value={campos.contacto} onChange={cambiar('contacto')} />
        <Campo etiqueta="Correo" type="email" value={campos.email} onChange={cambiar('email')} />
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Dirección" value={campos.direccion} onChange={cambiar('direccion')} />
          <Campo etiqueta="Comuna" value={campos.comuna} onChange={cambiar('comuna')} />
        </div>
        <Campo
          etiqueta="Condiciones"
          value={campos.condiciones}
          onChange={cambiar('condiciones')}
          placeholder="Contado, transferencia, 30 días"
        />
        <Campo
          etiqueta="Días que dura su cotización"
          type="number"
          inputMode="numeric"
          value={campos.validez}
          onChange={cambiar('validez')}
          pista="un distribuidor cotiza a tres días. Con esto la app avisa cuando un precio venció."
        />
        <Area etiqueta="Nota" value={campos.nota} onChange={cambiar('nota')} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Guardar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}
