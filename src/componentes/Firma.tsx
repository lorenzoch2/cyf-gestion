import { useEffect, useRef, useState } from 'react'
import { Boton } from './ui'

/*
  La firma del cliente, con el dedo.

  Es lo que convierte el informe en una conformidad firmada: sirve para cobrar
  y para responder si después reclaman que el trabajo no se hizo.

  Dos cuidados que no son obvios:

  — El lienzo se dibuja a la resolución real de la pantalla (`devicePixelRatio`)
    y se muestra al tamaño CSS. Sin eso, en un teléfono la firma sale pixelada y
    después se ve peor todavía en el PDF.

  — `touch-action: none` en el lienzo: sin eso, arrastrar el dedo para firmar
    hace desplazar la página y la firma queda cortada.
*/
export function Firma({
  valor,
  alCambiar,
}: {
  valor: string | null
  alCambiar: (dataUrl: string | null) => void
}) {
  const lienzoRef = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const [tieneTrazo, setTieneTrazo] = useState(Boolean(valor))

  useEffect(() => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    const escala = window.devicePixelRatio || 1
    const ancho = lienzo.clientWidth
    const alto = lienzo.clientHeight
    lienzo.width = ancho * escala
    lienzo.height = alto * escala

    const pincel = lienzo.getContext('2d')
    if (!pincel) return
    pincel.scale(escala, escala)
    pincel.lineWidth = 2
    pincel.lineCap = 'round'
    pincel.lineJoin = 'round'
    pincel.strokeStyle = '#14181f'

    // Si ya había firma guardada, se vuelve a pintar encima.
    if (valor) {
      const imagen = new Image()
      imagen.onload = () => pincel.drawImage(imagen, 0, 0, ancho, alto)
      imagen.src = valor
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const caja = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - caja.left, y: e.clientY - caja.top }
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    const pincel = lienzoRef.current?.getContext('2d')
    if (!pincel) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dibujando.current = true
    const p = punto(e)
    pincel.beginPath()
    pincel.moveTo(p.x, p.y)
  }

  function seguir(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return
    const pincel = lienzoRef.current?.getContext('2d')
    if (!pincel) return
    const p = punto(e)
    pincel.lineTo(p.x, p.y)
    pincel.stroke()
    if (!tieneTrazo) setTieneTrazo(true)
  }

  function terminar() {
    if (!dibujando.current) return
    dibujando.current = false
    const lienzo = lienzoRef.current
    if (lienzo) alCambiar(lienzo.toDataURL('image/png'))
  }

  function limpiar() {
    const lienzo = lienzoRef.current
    const pincel = lienzo?.getContext('2d')
    if (!lienzo || !pincel) return
    pincel.clearRect(0, 0, lienzo.width, lienzo.height)
    setTieneTrazo(false)
    alCambiar(null)
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-mut">Firma de quien recibe</span>
        {tieneTrazo && (
          <button onClick={limpiar} className="text-sm font-medium text-acero-dk">
            Borrar
          </button>
        )}
      </div>
      <canvas
        ref={lienzoRef}
        onPointerDown={empezar}
        onPointerMove={seguir}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        className="h-36 w-full touch-none rounded-lg border border-linea-2 bg-white"
      />
      {!tieneTrazo && (
        <p className="mt-1 text-xs text-faint">Firmar con el dedo sobre el recuadro.</p>
      )}
    </div>
  )
}

/** Un botón de conformidad, para no inventar dos formas de decir lo mismo. */
export function Conformidad({
  valor,
  alCambiar,
}: {
  valor: boolean | null
  alCambiar: (v: boolean) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        [true, 'Conforme'],
        [false, 'Con observaciones'],
      ].map(([v, texto]) => (
        <Boton
          key={String(v)}
          variante={valor === v ? 'acento' : 'linea'}
          onClick={() => alCambiar(v as boolean)}
        >
          {texto as string}
        </Boton>
      ))}
    </div>
  )
}
