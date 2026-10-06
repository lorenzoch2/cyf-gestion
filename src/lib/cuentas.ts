import { db } from './supabase'

/*
  Crear cuentas de acceso.

  El navegador no puede hacerlo solo: crear usuarios en Supabase exige la llave
  de servicio, y esa llave no puede viajar al teléfono. La creación la hace una
  función de Netlify —netlify/functions/crear-usuario.mts— y aquí sólo se le
  pide, firmando con la sesión de quien lo está pidiendo.
*/

export async function crearCuenta(
  email: string,
  clave: string,
  nombre?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await db().auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, error: 'No hay sesión iniciada.' }

  let respuesta: Response
  try {
    respuesta = await fetch('/.netlify/functions/crear-usuario', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ email, clave, nombre }),
    })
  } catch {
    return { ok: false, error: 'No se pudo llegar al servidor.' }
  }

  // En el servidor de desarrollo la función no existe: conviene decirlo claro
  // en vez de mostrar un error de JSON.
  if (respuesta.status === 404) {
    return { ok: false, error: 'Esto sólo funciona en el sitio publicado, no en desarrollo.' }
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string }
  if (!respuesta.ok) return { ok: false, error: cuerpo.error ?? 'No se pudo crear la cuenta.' }
  return { ok: true }
}
