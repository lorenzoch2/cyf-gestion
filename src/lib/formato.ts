/** Formato chileno: pesos sin decimales, fechas cortas, enlaces de contacto. */

export const IVA = 0.19

/** «1 local» y «2 locales»: el contador no debe sonar a robot. */
export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

export function clp(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—'
  return '$' + Math.round(valor).toLocaleString('es-CL')
}

export function conIva(neto: number): number {
  return Math.round(neto * (1 + IVA))
}

/** `2026-10-05` → `5 oct` · con año si no es el actual. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const f = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (f.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric'
  return f.toLocaleDateString('es-CL', opciones).replace('.', '')
}

export function hoyIso(): string {
  const f = new Date()
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function sumarDias(dias: number): string {
  const f = new Date()
  f.setDate(f.getDate() + dias)
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Días que faltan para una fecha: negativo si ya pasó. */
export function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const hoy = new Date(hoyIso() + 'T12:00:00').getTime()
  const destino = new Date(iso + 'T12:00:00').getTime()
  return Math.round((destino - hoy) / 86400000)
}

export function vencimiento(iso: string | null | undefined): { texto: string; tono: 'rojo' | 'laton' | 'mut' } {
  const dias = diasHasta(iso)
  if (dias === null) return { texto: 'sin fecha', tono: 'mut' }
  if (dias < 0) return { texto: `atrasada ${-dias} d`, tono: 'rojo' }
  if (dias === 0) return { texto: 'hoy', tono: 'rojo' }
  if (dias === 1) return { texto: 'mañana', tono: 'laton' }
  if (dias <= 7) return { texto: `en ${dias} días`, tono: 'laton' }
  return { texto: fechaCorta(iso), tono: 'mut' }
}

/** +56 9 1234 5678 → enlaces listos para el teléfono. */
export function soloDigitos(telefono: string | null | undefined): string {
  return (telefono ?? '').replace(/\D/g, '')
}

export function enlaceLlamada(telefono: string | null | undefined): string | null {
  const d = soloDigitos(telefono)
  return d.length >= 8 ? `tel:+${d.startsWith('56') ? d : '56' + d}` : null
}

export function enlaceWhatsapp(telefono: string | null | undefined, texto?: string): string | null {
  const d = soloDigitos(telefono)
  if (d.length < 8) return null
  const numero = d.startsWith('56') ? d : '56' + d
  return `https://wa.me/${numero}${texto ? '?text=' + encodeURIComponent(texto) : ''}`
}

export function enlaceMapa(lat: number | null, lng: number | null, direccion?: string | null): string | null {
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  if (direccion) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion + ', Santiago')}`
  }
  return null
}
