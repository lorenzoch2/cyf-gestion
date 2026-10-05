import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Buscador, Cargando, Etiqueta, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import { consultarProspectos, useConsulta } from '../lib/datos'
import { ESTADOS_PROSPECTO, ZONAS, type Prospecto } from '../lib/tipos'

const FILTROS_ZONA: [string, string][] = [['', 'Todas'], ...Object.entries(ZONAS)]
const FILTROS_ESTADO: [string, string][] = [
  ['', 'Todos'],
  ['por_visitar', 'Por visitar'],
  ['visitado', 'Visitados'],
  ['evaluacion', 'Evaluación'],
  ['cliente', 'Clientes'],
]

export function Prospectos() {
  const [zona, setZona] = useState('')
  const [estado, setEstado] = useState('por_visitar')
  const [busqueda, setBusqueda] = useState('')
  const { datos, cargando } = useConsulta<Prospecto[]>(
    () => consultarProspectos({ zona: zona || undefined, estado: estado || undefined, busqueda: busqueda || undefined }),
    [zona, estado, busqueda],
  )

  const lista = datos ?? []

  return (
    <Pantalla titulo="Prospectos" bajada={cargando ? undefined : `${lista.length} locales en la lista`}>
      <Buscador valor={busqueda} alCambiar={setBusqueda} marcador="Buscar local" />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS_ZONA.map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => setZona(valor)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              zona === valor ? 'border-laton bg-laton/15 text-laton-dk' : 'border-linea-2 bg-white text-mut'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS_ESTADO.map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => setEstado(valor)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              estado === valor ? 'border-acero bg-acero/12 text-acero-dk' : 'border-linea-2 bg-white text-mut'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {cargando ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio texto="Ningún local con esos filtros." />
        ) : (
          <ul className="space-y-2">
            {lista.map(p => (
              <li key={p.id}>
                <Link to={`/prospectos/${p.id}`}>
                  <Tarjeta className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.nombre}</p>
                        <p className="truncate text-sm text-mut">
                          {p.rubro}
                          {p.direccion ? ` · ${p.direccion}` : ''}
                        </p>
                      </div>
                      {p.prioridad === 'alta' && <Etiqueta tono="laton">alta</Etiqueta>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Etiqueta tono="mut">{ZONAS[p.zona ?? ''] ?? p.zona}</Etiqueta>
                      {p.estado !== 'por_visitar' && (
                        <Etiqueta tono={p.estado === 'cliente' ? 'verde' : 'acero'}>
                          {ESTADOS_PROSPECTO[p.estado]}
                        </Etiqueta>
                      )}
                    </div>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pantalla>
  )
}
