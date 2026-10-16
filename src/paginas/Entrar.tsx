import { useState, type FormEvent } from 'react'
import { Boton, Campo, Error } from '../componentes/ui'
import { Marca } from '../componentes/Marca'
import { useSesion } from '../lib/sesion'

/*
  La primera pantalla de la empresa.

  Antes era un título y dos campos flotando en el papel: la misma cara que
  tendría cualquier formulario. Ahora entra la celosía, que es lo único que
  dice de quién es esto antes de escribir una letra.
*/
export function Entrar() {
  const { entrar } = useSesion()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(await entrar(email.trim(), clave))
    setEnviando(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <Marca tamano={52} />
      <p className="mt-5 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-laton-dk">
        Calor y Frío Industrial
      </p>
      <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-tight">Gestión</h1>
      <p className="mt-2 text-sm text-mut">
        Prospectos, clientes, negocios y tarifario de la empresa.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-4">
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Clave"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={e => setClave(e.target.value)}
        />
        {error && <Error mensaje={error} />}
        <Boton type="submit" variante="acento" className="w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>

      <p className="mt-6 text-xs text-faint">
        Las cuentas las crea el administrador en Supabase. No hay registro abierto.
      </p>
    </div>
  )
}
