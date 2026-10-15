import { useState } from 'react'
import { Pantalla, Tarjeta } from '../componentes/ui'
import { GUIA, type Bloque, type SeccionGuia } from '../lib/guia'

/*
  La guía, en el bolsillo.

  Se lee de pie en la vereda, antes de entrar a un local, con una mano. Por eso
  va plegada: títulos cortos que se barren de un vistazo y una sola sección
  abierta a la vez. Una guía que hay que scrollear entera no se lee nunca.
*/

function Contenido({ bloque }: { bloque: Bloque }) {
  if (bloque.tipo === 'texto') {
    return <p className="text-sm text-mut">{bloque.texto}</p>
  }

  if (bloque.tipo === 'decir') {
    // Lo que se dice en voz alta va distinto del resto: en la calle se
    // reconoce de un vistazo sin tener que leerlo.
    return (
      <p className="border-l-2 border-laton bg-laton/8 py-2 pl-3 pr-2 text-sm font-medium">
        {bloque.texto}
      </p>
    )
  }

  if (bloque.tipo === 'pasos') {
    return (
      <ol className="space-y-1.5">
        {bloque.pasos.map((paso, i) => (
          <li key={paso} className="flex gap-2.5 text-sm">
            <span className="shrink-0 font-mono text-xs text-faint">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-mut">{paso}</span>
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ul className="space-y-2">
      {bloque.items.map(item => (
        <li key={item.titulo}>
          <p className="text-sm font-medium">{item.titulo}</p>
          <p className="text-sm text-mut">{item.texto}</p>
        </li>
      ))}
    </ul>
  )
}

function Seccion({
  seccion,
  abierta,
  alAlternar,
}: {
  seccion: SeccionGuia
  abierta: boolean
  alAlternar: () => void
}) {
  return (
    <Tarjeta className="p-0">
      <button onClick={alAlternar} className="block w-full p-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{seccion.titulo}</p>
            <p className="truncate text-sm text-mut">{seccion.resumen}</p>
          </div>
          <span className="shrink-0 text-xs text-acero-dk">{abierta ? 'Cerrar' : 'Abrir'}</span>
        </div>
      </button>
      {abierta && (
        <div className="space-y-3 border-t border-linea p-3">
          {seccion.bloques.map((bloque, i) => (
            <Contenido key={i} bloque={bloque} />
          ))}
        </div>
      )}
    </Tarjeta>
  )
}

export function Guia() {
  const [parte, setParte] = useState<'venta' | 'app'>('venta')
  const [abierta, setAbierta] = useState<string | null>(null)

  const secciones = GUIA.filter(s => s.parte === parte)

  return (
    <Pantalla titulo="Guía" bajada="Cómo se vende y cómo se usa la app" volver>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(
          [
            ['venta', 'En la calle'],
            ['app', 'La app'],
          ] as [typeof parte, string][]
        ).map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => {
              setParte(valor)
              setAbierta(null)
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              parte === valor
                ? 'border-grafito bg-grafito text-papel'
                : 'border-linea-2 bg-white text-mut'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {secciones.map(s => (
          <li key={s.id}>
            <Seccion
              seccion={s}
              abierta={abierta === s.id}
              alAlternar={() => setAbierta(a => (a === s.id ? null : s.id))}
            />
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-faint">
        El libreto no es para recitarlo. Son preguntas: el que pregunta manda la conversación, y lo
        que el dueño conteste es lo que después se le vende.
      </p>
    </Pantalla>
  )
}
