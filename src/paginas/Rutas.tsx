import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boton, Campo, Cargando, Confirmar, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoAgregar, IconoFlecha } from '../componentes/iconos'
import { borrarRuta, consultarRutas, crearRuta, guardarRuta, resumenRutas, useConsulta } from '../lib/datos'
import { fechaCorta, hoyIso, plural } from '../lib/formato'
import { ESTADOS_RUTA, ZONAS, type EstadoRuta, type Ruta } from '../lib/tipos'

/**
 * Rutas de visita: un puñado de locales que se recorren el mismo día.
 *
 * Existe para que salir a la calle sea «hoy hago esta ruta» y no «abro la lista
 * de 333 y veo». Los locales se asignan desde la ficha de cada uno.
 */
export function Rutas() {
  const navegar = useNavigate()
  const { datos, cargando, recargar } = useConsulta<Ruta[]>(() => consultarRutas(), [])
  const conteo = useConsulta(() => resumenRutas().then(data => ({ data, error: null })), [])

  const [hoja, setHoja] = useState<'nueva' | 'editar' | null>(null)
  const [enEdicion, setEnEdicion] = useState<Ruta | null>(null)
  const [borrando, setBorrando] = useState<Ruta | null>(null)

  const [nombre, setNombre] = useState('')
  const [zona, setZona] = useState('egana')
  const [fecha, setFecha] = useState(hoyIso())
  const [estado, setEstado] = useState<EstadoRuta>('planificada')

  function abrirNueva() {
    setNombre('')
    setZona('egana')
    setFecha(hoyIso())
    setEstado('planificada')
    setHoja('nueva')
  }

  function abrirEdicion(r: Ruta) {
    setEnEdicion(r)
    setNombre(r.nombre)
    setZona(r.zona ?? 'egana')
    setFecha(r.fecha ?? hoyIso())
    setEstado(r.estado)
    setHoja('editar')
  }

  async function guardar() {
    if (!nombre.trim()) return
    const datosRuta = { nombre: nombre.trim(), zona, fecha: fecha || null, estado }
    if (hoja === 'editar' && enEdicion) await guardarRuta(enEdicion.id, datosRuta)
    else await crearRuta(datosRuta)
    setHoja(null)
    setEnEdicion(null)
    void recargar()
  }

  const rutas = datos ?? []
  const cuentas = conteo.datos ?? {}

  return (
    <Pantalla
      titulo="Rutas"
      bajada="Lo que se camina en una tarde"
      volver
      accion={
        <Boton variante="acento" onClick={abrirNueva} aria-label="Nueva ruta">
          <IconoAgregar />
        </Boton>
      }
    >
      {cargando ? (
        <Cargando />
      ) : rutas.length === 0 ? (
        <Vacio texto="Sin rutas todavía. Crea una y después asigna locales desde la ficha de cada uno." />
      ) : (
        <ul className="space-y-2">
          {rutas.map(r => {
            const c = cuentas[r.id] ?? { total: 0, porVisitar: 0 }
            return (
              <li key={r.id}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.nombre}</p>
                      <p className="text-sm text-mut">
                        {[ZONAS[r.zona ?? ''] ?? r.zona, fechaCorta(r.fecha)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-tinte px-1.5 py-0.5 text-[0.7rem] text-mut">
                      {ESTADOS_RUTA[r.estado]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm">
                    {plural(c.total, 'local', 'locales')}
                    {c.total > 0 && (
                      <span className="text-mut"> · {c.porVisitar} por visitar</span>
                    )}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Boton
                      className="min-h-9 flex-1 px-3 text-sm"
                      onClick={() => navegar(`/prospectos?ruta=${r.id}`)}
                    >
                      Ver locales <IconoFlecha />
                    </Boton>
                    <Boton className="min-h-9 px-3 text-sm" onClick={() => abrirEdicion(r)}>
                      Editar
                    </Boton>
                    <Boton variante="peligro" className="min-h-9 px-3 text-sm" onClick={() => setBorrando(r)}>
                      Borrar
                    </Boton>
                  </div>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      <Hoja
        abierta={hoja !== null}
        titulo={hoja === 'editar' ? 'Editar ruta' : 'Nueva ruta'}
        alCerrar={() => setHoja(null)}
      >
        <div className="space-y-3">
          <Campo
            etiqueta="Nombre"
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Irarrázabal poniente, martes"
          />
          <Selector etiqueta="Zona" opciones={Object.entries(ZONAS)} value={zona} onChange={e => setZona(e.target.value)} />
          <Campo etiqueta="Fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          <Selector
            etiqueta="Estado"
            opciones={Object.entries(ESTADOS_RUTA)}
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoRuta)}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardar}>Guardar</Boton>
          </div>
        </div>
      </Hoja>

      <Confirmar
        abierta={borrando !== null}
        titulo="¿Borrar la ruta?"
        detalle="Los locales no se borran: quedan sin ruta asignada."
        textoAceptar="Borrar ruta"
        peligro
        alCerrar={() => setBorrando(null)}
        alAceptar={async () => {
          if (borrando) await borrarRuta(borrando.id)
          void recargar()
          void conteo.recargar()
        }}
      />
    </Pantalla>
  )
}
