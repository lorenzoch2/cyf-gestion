import { db } from './supabase'

/*
  Las fotos del informe.

  El bucket es privado: una foto del interior de un local es del cliente, no
  del internet. Por eso nada se referencia por URL pública — se guarda la ruta
  y la app baja el archivo con la sesión de quien está mirando.

  Todo se comprime antes de subir. Una foto de teléfono son 4 MB y nadie los
  necesita para mostrar que un serpentín estaba tapado; a 1600 px de lado largo
  y calidad 0,72 quedan entre 150 y 400 KB. Importa dos veces: la subida ocurre
  en terreno con señal mala, y después esas mismas imágenes entran al PDF.
*/

const BUCKET = 'informes'
const LADO_MAXIMO = 1600
const CALIDAD = 0.72

/** Reduce y recomprime en el navegador. Devuelve siempre JPEG. */
export async function comprimir(archivo: File): Promise<Blob> {
  const mapa = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height))
  const ancho = Math.round(mapa.width * escala)
  const alto = Math.round(mapa.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const pincel = lienzo.getContext('2d')
  if (!pincel) return archivo
  pincel.drawImage(mapa, 0, 0, ancho, alto)
  mapa.close()

  const blob = await new Promise<Blob | null>(resolver =>
    lienzo.toBlob(resolver, 'image/jpeg', CALIDAD),
  )
  // Si el navegador no entrega blob, sube el original antes que fallar.
  return blob ?? archivo
}

export async function subirFoto(informeId: string, archivo: File) {
  const blob = await comprimir(archivo)
  const ruta = `${informeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) return { ruta: null, error: error.message }
  return { ruta, error: null }
}

export async function borrarFoto(ruta: string) {
  return db().storage.from(BUCKET).remove([ruta])
}

/**
 * Baja una foto y la deja como data URL.
 *
 * Sirve para mostrarla en pantalla y para meterla en el PDF, que necesita los
 * bytes y no sabe de sesiones.
 */
export async function leerFoto(ruta: string): Promise<string | null> {
  const { data, error } = await db().storage.from(BUCKET).download(ruta)
  if (error || !data) return null
  return new Promise(resolver => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result as string)
    lector.onerror = () => resolver(null)
    lector.readAsDataURL(data)
  })
}
