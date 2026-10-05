import { useState } from 'react'
import { Boton, Campo, Cargando, Hoja, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { consultarServicios, guardarServicio, useConsulta } from '../lib/datos'
import { clp, conIva } from '../lib/formato'
import { CATEGORIAS, type CategoriaServicio, type Servicio } from '../lib/tipos'

export function Tarifario() {
  const { datos, cargando, recargar } = useConsulta<Servicio[]>(() => consultarServicios(), [])
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [precio, setPrecio] = useState('')

  async function guardar() {
    if (!editando) return
    await guardarServicio(editando.id, { precio_neto: Number(precio) || editando.precio_neto })
    setEditando(null)
    void recargar()
  }

  const servicios = datos ?? []
  const categorias = Object.keys(CATEGORIAS) as CategoriaServicio[]

  return (
    <Pantalla titulo="Tarifario" bajada="Valores netos · el IVA se muestra al lado" volver>
      {cargando ? (
        <Cargando />
      ) : servicios.length === 0 ? (
        <Vacio texto="Sin servicios cargados. Falta correr seed-servicios.sql en Supabase." />
      ) : (
        <div className="space-y-6">
          {categorias.map(categoria => {
            const items = servicios.filter(s => s.categoria === categoria)
            if (items.length === 0) return null
            return (
              <section key={categoria}>
                <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-laton-dk">
                  {CATEGORIAS[categoria]}
                </h2>
                <ul className="space-y-2">
                  {items.map(s => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          setEditando(s)
                          setPrecio(String(s.precio_neto))
                        }}
                        className="w-full text-left"
                      >
                        <Tarjeta className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="text-sm">{s.nombre}</p>
                            <p className="text-xs text-faint">por {s.unidad}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-sm font-medium">{clp(s.precio_neto)}</p>
                            <p className="text-xs text-faint">{clp(conIva(s.precio_neto))} c/IVA</p>
                          </div>
                        </Tarjeta>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <Hoja abierta={!!editando} titulo={editando?.nombre ?? ''} alCerrar={() => setEditando(null)}>
        <div className="space-y-3">
          <Campo
            etiqueta="Precio neto"
            type="number"
            inputMode="numeric"
            autoFocus
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            pista={`Con IVA queda en ${clp(conIva(Number(precio) || 0))}`}
          />
          <Boton variante="acento" className="w-full" onClick={guardar}>
            Guardar precio
          </Boton>
          <p className="text-xs text-faint">
            El tarifario de la carpeta de la empresa es el documento oficial. Si cambias un precio
            acá, cámbialo también allá.
          </p>
        </div>
      </Hoja>
    </Pantalla>
  )
}
