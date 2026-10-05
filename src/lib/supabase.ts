import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
  Un solo cliente para toda la app.

  Si faltan las variables, `supabase` queda en null y la app muestra la pantalla
  de configuración en vez de reventar con un error de red incomprensible.
*/
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hayConfiguracion = Boolean(url && anon)

export const supabase: SupabaseClient | null = hayConfiguracion
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'cyf-sesion',
      },
    })
  : null

/** El cliente, dando por hecho que hay configuración. Usar dentro de la app. */
export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}
