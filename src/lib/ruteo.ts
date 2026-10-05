/**
 * El recorrido dibujado por las calles, no en línea recta.
 *
 * Lo resuelve Valhalla en la instancia pública de OpenStreetMap: sin llave ni
 * tarjeta, con perfil `pedestrian`, que es como se hace la prospección. A un
 * peatón no le aplican los sentidos únicos de Irarrázaval ni las medianas de
 * Grecia, y el perfil de auto haría dar vueltas de tres cuadras para cruzar a
 * la vereda de enfrente.
 *
 * El servidor acepta diez paradas por consulta, así que un recorrido largo se
 * pide por trozos que se solapan en la parada del borde: la llegada de un trozo
 * es la salida del siguiente.
 *
 * Si el servicio no responde, devuelve `null` y el mapa vuelve a la línea
 * recta. Es un apoyo para planificar, no un requisito para salir a la calle.
 */

const SERVIDOR = 'https://valhalla1.openstreetmap.de/route'

/** Tope del servidor público. */
const POR_CONSULTA = 10

/** Paradas que se trazan y se miden: el tramo de una jornada. */
export const MAX_TRAZADO = 20

const ESPERA = 20000

export interface Tramo {
  metros: number
  segundos: number
}

export interface Trazado {
  /** Los vértices del camino, listos para una `Polyline`. */
  linea: [number, number][]
  metros: number
  segundos: number
  /** Un tramo por salto entre paradas: `tramos[0]` va de la 1 a la 2. */
  tramos: Tramo[]
}

/**
 * Geometría codificada de Valhalla, que viene en precisión de un millonésimo
 * de grado —no en cien milésimos como la de Google—.
 */
function decodificar(forma: string): [number, number][] {
  const puntos: [number, number][] = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < forma.length) {
    for (let eje = 0; eje < 2; eje++) {
      let resultado = 0
      let turno = 0
      let byte = 0
      do {
        byte = forma.charCodeAt(i++) - 63
        resultado |= (byte & 0x1f) << turno
        turno += 5
      } while (byte >= 0x20)
      const delta = resultado & 1 ? ~(resultado >> 1) : resultado >> 1
      if (eje === 0) lat += delta
      else lng += delta
    }
    puntos.push([lat / 1e6, lng / 1e6])
  }
  return puntos
}

function senalDe(propia?: AbortSignal): AbortSignal {
  const tiempo = AbortSignal.timeout(ESPERA)
  if (!propia) return tiempo
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([propia, tiempo]) : propia
}

export async function trazarRecorrido(
  paradas: [number, number][],
  propia?: AbortSignal,
): Promise<Trazado | null> {
  const usadas = paradas.slice(0, MAX_TRAZADO)
  if (usadas.length < 2) return null

  const linea: [number, number][] = []
  const tramos: Tramo[] = []
  let metros = 0
  let segundos = 0

  for (let inicio = 0; inicio < usadas.length - 1; inicio += POR_CONSULTA - 1) {
    const trozo = usadas.slice(inicio, inicio + POR_CONSULTA)
    if (trozo.length < 2) break

    const consulta = {
      locations: trozo.map(([lat, lon]) => ({ lat, lon, type: 'break' })),
      costing: 'pedestrian',
      directions_type: 'none',
      directions_options: { units: 'kilometers' },
    }

    try {
      const respuesta = await fetch(
        `${SERVIDOR}?json=${encodeURIComponent(JSON.stringify(consulta))}`,
        { signal: senalDe(propia) },
      )
      if (!respuesta.ok) return null
      const viaje = (await respuesta.json()).trip
      if (!viaje?.legs?.length) return null

      for (const pata of viaje.legs) {
        const vertices = decodificar(pata.shape)
        // El primer vértice de un tramo repite el último del anterior.
        linea.push(...(linea.length ? vertices.slice(1) : vertices))
        tramos.push({ metros: pata.summary.length * 1000, segundos: pata.summary.time })
      }
      metros += viaje.summary.length * 1000
      segundos += viaje.summary.time
    } catch {
      return null
    }
  }

  return linea.length ? { linea, metros, segundos, tramos } : null
}
