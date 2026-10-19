import { jsPDF } from 'jspdf'
import archivo400 from '../assets/fuentes/Archivo-400.ttf?url'
import archivo600 from '../assets/fuentes/Archivo-600.ttf?url'
import plexMono from '../assets/fuentes/PlexMono-400.ttf?url'
import lockup from '../assets/marca/lockup-horizontal.png?url'
import { clp, conIva, IVA } from './formato'
import type { Cliente, LineaPresupuesto, Presupuesto, Prospecto } from './tipos'

/*
  El presupuesto en PDF, armado en el teléfono.

  No hay servidor: el documento se compone en el navegador y sale como archivo,
  listo para compartir por WhatsApp o correo. Las tipografías y el logotipo son
  los mismos de la marca —van incrustados— para que el PDF de la app y el que
  sale del generador de la carpeta de la empresa se vean como el mismo papel.

  Medidas en milímetros, hoja A4.
*/

const MARGEN = 18
const ANCHO = 210
const ALTO = 297
const UTIL = ANCHO - MARGEN * 2

const GRAFITO: [number, number, number] = [20, 24, 31]
const MUT: [number, number, number] = [89, 98, 111]
const FAINT: [number, number, number] = [131, 140, 153]
const LATON: [number, number, number] = [138, 103, 48]
const LINEA: [number, number, number] = [221, 227, 234]
const TINTE: [number, number, number] = [238, 241, 246]

/*
  Las mismas que imprime el generador de la carpeta de la empresa. Si cambian
  allá, cambian acá: un presupuesto hecho en el teléfono y otro hecho en el
  computador no pueden prometer cosas distintas.

  La del precio de los equipos no es un formalismo. Las listas de proveedor
  vencen en días o semanas y a veces se cotiza con la última que hay, ya
  vencida, porque es la única. Decirlo por escrito es lo que permite recotizar
  al contratar sin que el cliente lo sienta un cambio de trato.
*/
const CONDICIONES = [
  'Valores netos: se agrega IVA del 19%.',
  'Validez de la oferta: 15 días corridos.',
  'Los precios de equipo son referenciales y están sujetos a cambio: salen de listas de proveedor que vencen en días o semanas, y se confirman al momento de contratar.',
  'Forma de pago: 50% al contratar y 50% contra entrega del informe de cierre.',
  'Garantía de 30 días sobre la mano de obra ejecutada.',
  'Repuestos, refrigerante y materiales se cotizan aparte.',
]

async function aBase64(url: string): Promise<string> {
  const buffer = await fetch(url).then(r => r.arrayBuffer())
  const bytes = new Uint8Array(buffer)
  let binario = ''
  // De a trozos: pasar el arreglo entero a fromCharCode revienta la pila.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

export interface DatosPdf {
  presupuesto: Presupuesto
  lineas: LineaPresupuesto[]
  cliente?: Cliente | null
  prospecto?: Prospecto | null
}

export async function generarPresupuestoPdf({ presupuesto, lineas, cliente, prospecto }: DatosPdf) {
  // `compress` importa: sin eso la imagen del logotipo entra como mapa de bits
  // crudo y un presupuesto de una página pesa 1,6 MB.
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

  const [normal, fuerte, mono, logo] = await Promise.all([
    aBase64(archivo400), aBase64(archivo600), aBase64(plexMono), aBase64(lockup),
  ])
  doc.addFileToVFS('Archivo-400.ttf', normal)
  doc.addFont('Archivo-400.ttf', 'Archivo', 'normal')
  doc.addFileToVFS('Archivo-600.ttf', fuerte)
  doc.addFont('Archivo-600.ttf', 'Archivo', 'bold')
  doc.addFileToVFS('PlexMono-400.ttf', mono)
  doc.addFont('PlexMono-400.ttf', 'PlexMono', 'normal')

  let y = MARGEN

  const texto = (
    t: string,
    x: number,
    yy: number,
    o: { fuente?: 'Archivo' | 'PlexMono'; peso?: 'normal' | 'bold'; tam?: number; color?: [number, number, number]; alinear?: 'left' | 'right' } = {},
  ) => {
    doc.setFont(o.fuente ?? 'Archivo', o.peso ?? 'normal')
    doc.setFontSize(o.tam ?? 9)
    doc.setTextColor(...(o.color ?? GRAFITO))
    doc.text(t, x, yy, { align: o.alinear ?? 'left' })
  }

  const linea = (yy: number, color = LINEA, grosor = 0.2) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(grosor)
    doc.line(MARGEN, yy, ANCHO - MARGEN, yy)
  }

  // ── Cabecera ──────────────────────────────────────────────────────────────
  doc.addImage(`data:image/png;base64,${logo}`, 'PNG', MARGEN, y, 46, 46 * (247 / 640))
  texto('PRESUPUESTO', ANCHO - MARGEN, y + 5, { fuente: 'PlexMono', tam: 8, color: LATON, alinear: 'right' })
  texto(presupuesto.numero ?? '—', ANCHO - MARGEN, y + 11, { peso: 'bold', tam: 13, alinear: 'right' })
  texto(
    new Date(presupuesto.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }),
    ANCHO - MARGEN, y + 16, { tam: 8.5, color: MUT, alinear: 'right' },
  )

  y += 26
  linea(y, GRAFITO, 0.5)
  y += 8

  // ── Cliente y trabajo ─────────────────────────────────────────────────────
  const destinatario = cliente?.nombre ?? prospecto?.nombre ?? 'Cliente por confirmar'
  const direccion = cliente?.direccion ?? prospecto?.direccion
  texto('PARA', MARGEN, y, { fuente: 'PlexMono', tam: 7, color: LATON })
  texto(destinatario, MARGEN, y + 5.5, { peso: 'bold', tam: 11 })
  let ySub = y + 10.5
  for (const dato of [cliente?.rut, direccion, cliente?.contacto_nombre ?? prospecto?.contacto_nombre].filter(Boolean)) {
    texto(String(dato), MARGEN, ySub, { tam: 8.5, color: MUT })
    ySub += 4.5
  }

  texto('TRABAJO', ANCHO - MARGEN, y, { fuente: 'PlexMono', tam: 7, color: LATON, alinear: 'right' })
  const titulo = doc.splitTextToSize(presupuesto.titulo ?? 'Servicio', UTIL * 0.45) as string[]
  let yTitulo = y + 5.5
  for (const l of titulo.slice(0, 3)) {
    texto(l, ANCHO - MARGEN, yTitulo, { tam: 10, alinear: 'right' })
    yTitulo += 5
  }

  y = Math.max(ySub, yTitulo) + 6

  // ── Detalle ───────────────────────────────────────────────────────────────
  const COL_CANT = ANCHO - MARGEN - 62
  const COL_UNIT = ANCHO - MARGEN - 32
  const COL_TOTAL = ANCHO - MARGEN

  doc.setFillColor(...GRAFITO)
  doc.rect(MARGEN, y, UTIL, 7, 'F')
  texto('DETALLE', MARGEN + 2.5, y + 4.7, { fuente: 'PlexMono', tam: 7, color: [255, 255, 255] })
  texto('CANT.', COL_CANT, y + 4.7, { fuente: 'PlexMono', tam: 7, color: [255, 255, 255], alinear: 'right' })
  texto('UNITARIO', COL_UNIT, y + 4.7, { fuente: 'PlexMono', tam: 7, color: [255, 255, 255], alinear: 'right' })
  texto('TOTAL', COL_TOTAL - 2.5, y + 4.7, { fuente: 'PlexMono', tam: 7, color: [255, 255, 255], alinear: 'right' })
  y += 7

  const neto = lineas.reduce((t, l) => t + l.cantidad * l.precio_unitario_neto, 0)

  lineas.forEach((l, i) => {
    // El ancho deja un respiro de 10 mm antes de la cantidad: sin eso una
    // descripción larga termina pegada al número.
    const partes = doc.splitTextToSize(l.descripcion, COL_CANT - (MARGEN + 2.5) - 10) as string[]
    const alto = Math.max(8, partes.length * 4.4 + 3.6)

    if (y + alto > ALTO - 60) {
      doc.addPage()
      y = MARGEN
    }
    if (i % 2 === 1) {
      doc.setFillColor(...TINTE)
      doc.rect(MARGEN, y, UTIL, alto, 'F')
    }

    let yLinea = y + 5.2
    for (const parte of partes) {
      texto(parte, MARGEN + 2.5, yLinea, { tam: 9 })
      yLinea += 4.4
    }
    texto(String(l.cantidad), COL_CANT, y + 5.2, { fuente: 'PlexMono', tam: 9, alinear: 'right' })
    texto(clp(l.precio_unitario_neto), COL_UNIT, y + 5.2, { fuente: 'PlexMono', tam: 9, alinear: 'right' })
    texto(clp(l.cantidad * l.precio_unitario_neto), COL_TOTAL - 2.5, y + 5.2, {
      fuente: 'PlexMono', tam: 9, peso: 'bold', alinear: 'right',
    })

    y += alto
    linea(y)
  })

  // ── Totales ───────────────────────────────────────────────────────────────
  const rebaja = Math.round((neto * Number(presupuesto.descuento_pct)) / 100)
  const netoFinal = neto - rebaja
  const total = conIva(netoFinal)

  if (y + 46 > ALTO - MARGEN) {
    doc.addPage()
    y = MARGEN
  }
  y += 5

  const fila = (etiqueta: string, valor: string, destacado = false) => {
    texto(etiqueta, COL_UNIT, y, { tam: destacado ? 10 : 9, color: destacado ? GRAFITO : MUT, peso: destacado ? 'bold' : 'normal', alinear: 'right' })
    texto(valor, COL_TOTAL, y, { fuente: 'PlexMono', tam: destacado ? 11 : 9, peso: destacado ? 'bold' : 'normal', alinear: 'right' })
    y += destacado ? 7 : 5.5
  }

  fila('Neto', clp(neto))
  if (rebaja > 0) fila(`Descuento ${presupuesto.descuento_pct}%`, `-${clp(rebaja)}`)
  fila(`IVA ${Math.round(IVA * 100)}%`, clp(total - netoFinal))
  doc.setDrawColor(...GRAFITO)
  doc.setLineWidth(0.4)
  doc.line(COL_CANT, y - 3.5, ANCHO - MARGEN, y - 3.5)
  y += 1.5
  fila('Total', clp(total), true)

  // ── Condiciones ───────────────────────────────────────────────────────────
  y += 6
  texto('CONDICIONES', MARGEN, y, { fuente: 'PlexMono', tam: 7, color: LATON })
  y += 5
  for (const condicion of CONDICIONES) {
    doc.setFillColor(...LATON)
    doc.circle(MARGEN + 0.9, y - 1.1, 0.6, 'F')
    texto(condicion, MARGEN + 4, y, { tam: 8.5, color: MUT })
    y += 4.6
  }

  if (presupuesto.notas) {
    y += 3
    for (const l of doc.splitTextToSize(presupuesto.notas, UTIL) as string[]) {
      texto(l, MARGEN, y, { tam: 8.5, color: MUT })
      y += 4.4
    }
  }

  // ── Pie, en todas las páginas ─────────────────────────────────────────────
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    linea(ALTO - 20, LINEA, 0.2)
    texto('Calor y Frío Industrial SpA · R.U.T. 78.333.185-3 · Climatización · Refrigeración · Ventilación',
      MARGEN, ALTO - 15, { tam: 7.5, color: MUT })
    texto('Zanzibar Oriente 7473, Las Condes, Santiago · +56 9 9138 9110 · contacto@caloryfrioindustrial.cl · caloryfrioindustrial.cl',
      MARGEN, ALTO - 11.5, { tam: 7.5, color: FAINT })
    if (paginas > 1) {
      texto(`${p} / ${paginas}`, ANCHO - MARGEN, ALTO - 11.5, { fuente: 'PlexMono', tam: 7.5, color: FAINT, alinear: 'right' })
    }
  }

  return doc.output('blob') as Blob
}

/** Lo manda por donde el teléfono sepa; si no hay dónde, lo descarga. */
export async function compartirPdf(blob: Blob, nombre: string) {
  const archivo = new File([blob], nombre, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre })
      return 'compartido'
    } catch (error) {
      // Cancelar el menú de compartir no es un error que haya que mostrar.
      if ((error as Error).name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'descargado'
}
