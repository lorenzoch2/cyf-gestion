/** Iconos en línea: son pocos y así no entra una librería entera. */

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IconoHoy = () => (
  <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /></svg>
)
export const IconoMapa = () => (
  <svg {...base}><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0z" /><circle cx="12" cy="10.5" r="2.8" /></svg>
)
export const IconoClientes = () => (
  <svg {...base}><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20" /><circle cx="9" cy="8" r="3.4" /><path d="M16.5 20v-1.5a4.5 4.5 0 0 0-2.2-3.9" /><path d="M15.5 4.6a3.4 3.4 0 0 1 0 6.6" /></svg>
)
export const IconoNegocios = () => (
  <svg {...base}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M3 12h18" /></svg>
)
export const IconoMas = () => (
  <svg {...base}><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" /></svg>
)
export const IconoBuscar = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const IconoTelefono = () => (
  <svg {...base}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
)
export const IconoWhatsapp = () => (
  <svg {...base}><path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.5-4.6a8.4 8.4 0 1 1 15.5-4.3z" /><path d="M9.2 9.1c.2 2.4 2.5 4.7 4.9 4.9l.9-1.2 1.7.8-.3 1.4c-2.8.6-6.6-3.2-6-6l1.4-.3.8 1.7z" /></svg>
)
export const IconoFlecha = () => (
  <svg {...base} width="18" height="18"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
)
export const IconoVolver = () => (
  <svg {...base}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></svg>
)
export const IconoAgregar = () => (
  <svg {...base}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
)
export const IconoCheck = () => (
  <svg {...base}><path d="m5 13 4.5 4.5L19 7" /></svg>
)
export const IconoCerrar = () => (
  <svg {...base}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
)
export const IconoPin = () => (
  <svg {...base} width="18" height="18"><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0z" /><circle cx="12" cy="10.5" r="2.5" /></svg>
)
