import { useState } from 'react'
import { Boton, Campo, Cargando, Hoja, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import { borrarTarea, consultarTareas, crearTarea, guardarTarea, useConsulta } from '../lib/datos'
import { hoyIso, vencimiento } from '../lib/formato'
import type { Tarea } from '../lib/tipos'

export function Tareas() {
  const [verHechas, setVerHechas] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [vence, setVence] = useState(hoyIso())
  const { datos, cargando, recargar } = useConsulta<Tarea[]>(() => consultarTareas(!verHechas), [verHechas])

  async function agregar() {
    if (!titulo.trim()) return
    await crearTarea({ titulo: titulo.trim(), vence_en: vence || null })
    setTitulo('')
    setVence(hoyIso())
    setAbierta(false)
    void recargar()
  }

  async function alternar(t: Tarea) {
    await guardarTarea(t.id, { hecha: !t.hecha, hecha_en: t.hecha ? null : new Date().toISOString() })
    void recargar()
  }

  const tareas = datos ?? []

  return (
    <Pantalla
      titulo="Pendientes"
      volver
      accion={
        <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Agregar">
          <IconoAgregar />
        </Boton>
      }
    >
      <div className="mb-3 flex gap-2">
        <Boton variante={verHechas ? 'linea' : 'acento'} onClick={() => setVerHechas(false)}>
          Pendientes
        </Boton>
        <Boton variante={verHechas ? 'acento' : 'linea'} onClick={() => setVerHechas(true)}>
          Todas
        </Boton>
      </div>

      {cargando ? (
        <Cargando />
      ) : tareas.length === 0 ? (
        <Vacio texto="Sin pendientes anotados." />
      ) : (
        <ul className="space-y-2">
          {tareas.map(t => {
            const v = vencimiento(t.vence_en)
            return (
              <li key={t.id}>
                <Tarjeta className="flex items-start gap-3 p-3">
                  <button
                    onClick={() => alternar(t)}
                    aria-label={t.hecha ? 'Marcar como pendiente' : 'Marcar como hecha'}
                    className={`mt-0.5 size-5 shrink-0 rounded border ${
                      t.hecha ? 'border-verde bg-verde/20' : 'border-linea-2'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${t.hecha ? 'text-faint line-through' : ''}`}>{t.titulo}</p>
                    {t.detalle && <p className="mt-0.5 text-xs text-mut">{t.detalle}</p>}
                    {!t.hecha && (
                      <p className={`mt-0.5 text-xs ${v.tono === 'rojo' ? 'text-rojo' : v.tono === 'laton' ? 'text-laton-dk' : 'text-faint'}`}>
                        {v.texto}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await borrarTarea(t.id)
                      void recargar()
                    }}
                    className="shrink-0 text-xs text-faint active:text-rojo"
                  >
                    borrar
                  </button>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      <Hoja abierta={abierta} titulo="Nuevo pendiente" alCerrar={() => setAbierta(false)}>
        <div className="space-y-3">
          <Campo
            etiqueta="Qué hay que hacer"
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Volver a Minimarket Las Flores"
          />
          <Campo etiqueta="Para cuándo" type="date" value={vence} onChange={e => setVence(e.target.value)} />
          <Boton variante="acento" className="w-full" onClick={agregar}>
            Guardar
          </Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
