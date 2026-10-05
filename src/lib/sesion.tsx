import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/*
  Sesión de Supabase, viva en un contexto.

  Las cuentas se crean a mano en el panel de Supabase: son dos personas y no
  hay registro abierto. Aquí sólo se inicia y se cierra sesión.
*/

interface Contexto {
  sesion: Session | null
  cargando: boolean
  entrar: (email: string, clave: string) => Promise<string | null>
  salir: () => Promise<void>
}

const ContextoSesion = createContext<Contexto>({
  sesion: null,
  cargando: true,
  entrar: async () => 'Sin configuración',
  salir: async () => {},
})

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setCargando(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva))
    return () => data.subscription.unsubscribe()
  }, [])

  async function entrar(email: string, clave: string) {
    if (!supabase) return 'Falta configurar Supabase'
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (!error) return null
    // Supabase responde en inglés; aquí se dice en castellano lo que pasó.
    if (error.message.includes('Invalid login')) return 'Correo o clave incorrectos'
    if (error.message.includes('Email not confirmed')) return 'Falta confirmar el correo'
    return error.message
  }

  async function salir() {
    await supabase?.auth.signOut()
  }

  return (
    <ContextoSesion.Provider value={{ sesion, cargando, entrar, salir }}>
      {children}
    </ContextoSesion.Provider>
  )
}

export function useSesion() {
  return useContext(ContextoSesion)
}
