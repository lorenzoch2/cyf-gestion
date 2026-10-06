/*
  Crear una cuenta de acceso a la app.

  Esto no puede hacerse desde el navegador: crear usuarios en Supabase exige la
  llave `service_role`, que puede leer y escribir cualquier tabla saltándose las
  políticas. Si esa llave viajara al teléfono, cualquiera que abriera el código
  del sitio tendría la base completa. Por eso vive en una variable de entorno de
  Netlify y sólo la toca esta función, que corre en el servidor.

  Dos puertas antes de crear nada:
    1. quien llama tiene que venir con una sesión válida de la app;
    2. la llave de servicio tiene que estar configurada.

  La URL y la llave pública se leen de las variables que el sitio ya tiene. El
  prefijo `VITE_` sólo le importa a Vite al compilar —marca lo que puede viajar
  al navegador—; para esta función son variables de entorno como cualquier
  otra, así que no hay que duplicarlas con otro nombre. Los nombres sin prefijo
  quedan como alternativa por si algún día se configuran aparte.

  Lo único que hay que agregar en Netlify es la llave secreta:
    SUPABASE_SECRET_KEY   → Project Settings → API Keys → Secret keys
                            (en proyectos antiguos se llama service_role)
*/

const JSON_HEADERS = { 'content-type': 'application/json' }

function responder(cuerpo: unknown, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: JSON_HEADERS })
}

export default async (req: Request) => {
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const publica = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY
  const servicio = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !publica) {
    return responder({ error: 'Faltan las variables de Supabase en Netlify.' }, 500)
  }
  if (!servicio) {
    return responder(
      { error: 'Falta SUPABASE_SECRET_KEY en las variables de Netlify.' },
      500,
    )
  }

  // ─── Puerta 1: quien pide tiene que estar dentro ──────────────────────────
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return responder({ error: 'Sin sesión.' }, 401)

  const quien = await fetch(url + '/auth/v1/user', {
    headers: { apikey: publica, authorization: 'Bearer ' + token },
  })
  if (!quien.ok) return responder({ error: 'La sesión no es válida.' }, 401)

  // ─── Lo que se pide ───────────────────────────────────────────────────────
  let cuerpo: { email?: string; clave?: string; nombre?: string }
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'No se entendió la solicitud.' }, 400)
  }

  const email = (cuerpo.email ?? '').trim().toLowerCase()
  const clave = cuerpo.clave ?? ''
  if (!email.includes('@')) return responder({ error: 'El correo no parece correo.' }, 400)
  if (clave.length < 10) {
    return responder({ error: 'La clave tiene que tener al menos 10 caracteres.' }, 400)
  }

  // ─── Crear ────────────────────────────────────────────────────────────────
  //  `email_confirm` queda en true: la app es interna y no hay buzón que
  //  revisar en terreno. Quien crea la cuenta ya verificó quién es.
  const creado = await fetch(url + '/auth/v1/admin/users', {
    method: 'POST',
    headers: { apikey: servicio, authorization: 'Bearer ' + servicio, ...JSON_HEADERS },
    body: JSON.stringify({
      email,
      password: clave,
      email_confirm: true,
      user_metadata: cuerpo.nombre ? { nombre: cuerpo.nombre } : {},
    }),
  })

  if (!creado.ok) {
    const detalle = await creado.text()
    const yaExiste = detalle.includes('already been registered') || creado.status === 422
    return responder(
      { error: yaExiste ? 'Ese correo ya tiene cuenta.' : 'Supabase rechazó la creación.' },
      creado.status === 422 ? 409 : 502,
    )
  }

  const usuario = (await creado.json()) as { id?: string }
  return responder({ ok: true, id: usuario.id ?? null }, 201)
}
