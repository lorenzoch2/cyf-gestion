import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useEffect } from 'react'
import { IconoBuscar, IconoCerrar, IconoVolver } from './iconos'
import { useNavigate } from 'react-router-dom'

/*
  Piezas de interfaz. Mínimas a propósito: la app se usa de pie, en la calle,
  con una mano. Botones grandes, pocas opciones a la vista y nada que dependa
  de pasar el mouse por encima.
*/

export function Pantalla({
  titulo,
  bajada,
  volver,
  accion,
  children,
}: {
  titulo: string
  bajada?: string
  volver?: boolean
  accion?: ReactNode
  children: ReactNode
}) {
  const navegar = useNavigate()
  return (
    <div className="min-h-full">
      <header className="sobre-seguro sticky top-0 z-20 border-b border-linea bg-papel/95 backdrop-blur">
        <div className="flex items-start gap-3 px-4 py-3">
          {volver && (
            <button
              onClick={() => navegar(-1)}
              aria-label="Volver"
              className="-ml-1 mt-0.5 shrink-0 rounded p-1 text-mut active:bg-tinte"
            >
              <IconoVolver />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.35rem] font-semibold tracking-tight">{titulo}</h1>
            {bajada && <p className="mt-0.5 text-sm text-mut">{bajada}</p>}
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
      </header>
      <main className="px-4 pb-28 pt-3">{children}</main>
    </div>
  )
}

type VarianteBoton = 'acento' | 'linea' | 'texto' | 'peligro'

export function Boton({
  variante = 'linea',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  const estilos: Record<VarianteBoton, string> = {
    // El latón lleva texto grafito, nunca blanco: regla del manual de marca.
    acento: 'bg-laton text-grafito font-semibold active:bg-laton-dk active:text-papel',
    linea: 'border border-linea-2 bg-white text-grafito active:bg-tinte',
    texto: 'text-acero-dk active:bg-tinte',
    peligro: 'border border-rojo/30 text-rojo active:bg-rojo/10',
  }
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[0.95rem] disabled:opacity-50 ${estilos[variante]} ${className}`}
    />
  )
}

export function Campo({
  etiqueta,
  pista,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta?: string; pista?: string }) {
  return (
    <label className="block">
      {etiqueta && <span className="mb-1 block text-sm font-medium text-mut">{etiqueta}</span>}
      <input
        {...props}
        className={`w-full rounded-lg border border-linea-2 bg-white px-3 py-2.5 outline-none focus:border-acero ${className}`}
      />
      {pista && <span className="mt-1 block text-xs text-faint">{pista}</span>}
    </label>
  )
}

export function Area({
  etiqueta,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta?: string }) {
  return (
    <label className="block">
      {etiqueta && <span className="mb-1 block text-sm font-medium text-mut">{etiqueta}</span>}
      <textarea
        {...props}
        rows={props.rows ?? 3}
        className={`w-full rounded-lg border border-linea-2 bg-white px-3 py-2.5 outline-none focus:border-acero ${className}`}
      />
    </label>
  )
}

export function Selector({
  etiqueta,
  opciones,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta?: string; opciones: [string, string][] }) {
  return (
    <label className="block">
      {etiqueta && <span className="mb-1 block text-sm font-medium text-mut">{etiqueta}</span>}
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-linea-2 bg-white px-3 py-2.5 outline-none focus:border-acero ${className}`}
      >
        {opciones.map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Tarjeta({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-linea bg-white p-4 ${className}`}>{children}</div>
}

export function Etiqueta({
  tono = 'neutro',
  children,
}: {
  tono?: 'neutro' | 'laton' | 'acero' | 'verde' | 'rojo' | 'mut'
  children: ReactNode
}) {
  const tonos = {
    neutro: 'bg-tinte text-grafito',
    laton: 'bg-laton/15 text-laton-dk',
    acero: 'bg-acero/12 text-acero-dk',
    verde: 'bg-verde/12 text-verde',
    rojo: 'bg-rojo/10 text-rojo',
    mut: 'bg-tinte text-mut',
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${tonos[tono]}`}>
      {children}
    </span>
  )
}

export function Buscador({
  valor,
  alCambiar,
  marcador = 'Buscar',
}: {
  valor: string
  alCambiar: (v: string) => void
  marcador?: string
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
        <IconoBuscar />
      </span>
      <input
        value={valor}
        onChange={e => alCambiar(e.target.value)}
        placeholder={marcador}
        className="w-full rounded-lg border border-linea-2 bg-white py-2.5 pl-11 pr-3 outline-none focus:border-acero"
      />
    </div>
  )
}

export function Cargando() {
  return <p className="py-10 text-center text-sm text-faint">Cargando…</p>
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed border-linea-2 px-4 py-10 text-center text-sm text-mut">
      {texto}
    </div>
  )
}

export function Error({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-rojo/30 bg-rojo/5 px-4 py-3 text-sm text-rojo">
      {mensaje}
    </div>
  )
}

/** Hoja que sube desde abajo: es el gesto natural en el teléfono. */
export function Hoja({
  abierta,
  titulo,
  alCerrar,
  children,
}: {
  abierta: boolean
  titulo: string
  alCerrar: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierta, alCerrar])

  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-grafito/40" onClick={alCerrar}>
      <div
        onClick={e => e.stopPropagation()}
        className="bajo-seguro max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-papel p-4 pt-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={alCerrar} aria-label="Cerrar" className="rounded p-1 text-mut active:bg-tinte">
            <IconoCerrar />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Confirmación para lo que no se puede deshacer.
 *
 * Nada se borra ni se convierte de un solo toque: la app se usa caminando y un
 * dedo en la pantalla equivocada no debe costar un registro.
 */
export function Confirmar({
  abierta,
  titulo,
  detalle,
  textoAceptar = 'Confirmar',
  peligro = false,
  alAceptar,
  alCerrar,
}: {
  abierta: boolean
  titulo: string
  detalle?: string
  textoAceptar?: string
  peligro?: boolean
  alAceptar: () => void
  alCerrar: () => void
}) {
  return (
    <Hoja abierta={abierta} titulo={titulo} alCerrar={alCerrar}>
      {detalle && <p className="mb-4 text-sm text-mut">{detalle}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Boton onClick={alCerrar}>Cancelar</Boton>
        <Boton
          variante={peligro ? 'peligro' : 'acento'}
          onClick={() => {
            alAceptar()
            alCerrar()
          }}
        >
          {textoAceptar}
        </Boton>
      </div>
    </Hoja>
  )
}

/**
 * Aviso al pie, sobre la barra de navegación.
 *
 * Lleva una acción opcional —«Deshacer»— porque en la calle se registra con el
 * pulgar y a veces en el local equivocado. Doce segundos: lo que toma darse
 * cuenta, mirar la pantalla y alcanzar a tocar.
 */
export function Aviso({
  mensaje,
  accion,
  textoAccion = 'Deshacer',
  alCerrar,
}: {
  mensaje: string
  accion?: () => void
  textoAccion?: string
  alCerrar: () => void
}) {
  useEffect(() => {
    const t = setTimeout(alCerrar, 12000)
    return () => clearTimeout(t)
  }, [mensaje, alCerrar])

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-40 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-grafito px-4 py-3 text-papel shadow-lg">
        <span className="min-w-0 flex-1 text-sm">{mensaje}</span>
        {accion && (
          <button
            onClick={() => {
              accion()
              alCerrar()
            }}
            className="shrink-0 text-sm font-semibold text-laton-lt"
          >
            {textoAccion}
          </button>
        )}
      </div>
    </div>
  )
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linea py-2 last:border-0">
      <span className="shrink-0 text-sm text-mut">{etiqueta}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  )
}
