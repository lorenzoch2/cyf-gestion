import { useEffect, useState } from 'react'

/*
  Avisar cuando los datos no son los datos.

  Las pantallas pintan `datos ?? []`, así que una consulta que falla se ve
  exactamente igual que una lista vacía. En un escritorio da lo mismo; en la
  calle, con media barra de señal, es engañoso de verdad: la ficha de un
  cliente diría «sin equipos cargados» cuando lo que pasó es que no cargó
  nada, y uno sale a trabajar creyendo algo falso.

  En vez de repetir el manejo de error en veinticuatro pantallas, se avisa en
  un solo lugar: cada consulta reporta si le fue bien y una franja arriba dice
  la verdad cuando deja de irle bien.
*/

let fallos = 0
const oyentes = new Set<(n: number) => void>()

/** La llama `useConsulta` en cada respuesta. Un éxito borra la racha. */
export function reportarConsulta(huboError: boolean) {
  const antes = fallos
  fallos = huboError ? fallos + 1 : 0
  if (antes !== fallos) oyentes.forEach(avisar => avisar(fallos))
}

function useFallos() {
  const [n, setN] = useState(fallos)
  useEffect(() => {
    oyentes.add(setN)
    return () => {
      oyentes.delete(setN)
    }
  }, [])
  return n
}

export function AvisoConexion() {
  const fallos = useFallos()
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)

  useEffect(() => {
    const conectado = () => setEnLinea(true)
    const cortado = () => setEnLinea(false)
    window.addEventListener('online', conectado)
    window.addEventListener('offline', cortado)
    return () => {
      window.removeEventListener('online', conectado)
      window.removeEventListener('offline', cortado)
    }
  }, [])

  if (enLinea && fallos === 0) return null

  return (
    <div className="sobre-seguro fixed inset-x-0 top-0 z-40 bg-rojo text-white">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2">
        <p className="text-sm">
          {!enLinea
            ? 'Sin conexión. Lo que ves puede estar incompleto.'
            : 'No se pudieron cargar los datos. Lo que ves puede estar incompleto.'}
        </p>
        <button
          onClick={() => location.reload()}
          className="shrink-0 rounded border border-white/40 px-2 py-1 text-xs font-medium"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
