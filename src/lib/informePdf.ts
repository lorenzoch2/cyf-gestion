import { jsPDF } from 'jspdf'
import archivo400 from '../assets/fuentes/Archivo-400.ttf?url'
import archivo600 from '../assets/fuentes/Archivo-600.ttf?url'
import plexMono from '../assets/fuentes/PlexMono-400.ttf?url'
import lockup from '../assets/marca/lockup-horizontal.png?url'
import { fechaCorta } from './formato'
import { leerFoto } from './fotos'
import { familiaDe } from './diagnostico'
import {
  MEDICIONES_CIRCUITO, MEDICIONES_POR_FAMILIA, MOMENTOS_FOTO, NIVELES_HALLAZGO, TIPOS_EQUIPO,
  TIPOS_INFORME,
  type Cliente, type Equipo, type FotoInforme, type Hallazgo, type Informe,
  type InformeEquipo, type MaterialInforme, type Tecnico,
} from './tipos'

/*
  El informe de cierre en PDF.

  Es lo que el sitio promete cuando dice «trabajo medido y documentado», así que
  tiene que verse como el presupuesto: misma marca, mismas tipografías, mismo
  papel. Se compone en el teléfono, sin servidor.

  Las mediciones son opcionales a propósito: hoy faltan la pinza amperimétrica,
  el vacuómetro y el anemómetro, y un formulario que no se puede llenar no se
  llena ni cuando se pueda. Las secciones vacías simplemente no se dibujan.
*/

const MARGEN = 18
const ANCHO = 210
const ALTO = 297
const UTIL = ANCHO - MARGEN * 2

const GRAFITO: [number, number, number] = [20, 24, 31]
const MUT: [number, number, number] = [89, 98, 111]
const FAINT: [number, number, number] = [131, 140, 153]
const LATON: [number, number, number] = [138, 103, 48]
const ACERO: [number, number, number] = [79, 115, 168]
const ROJO: [number, number, number] = [179, 38, 30]
const LINEA: [number, number, number] = [221, 227, 234]

async function aBase64(url: string): Promise<string> {
  const buffer = await fetch(url).then(r => r.arrayBuffer())
  const bytes = new Uint8Array(buffer)
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

export interface DatosInforme {
  informe: Informe
  bloques: InformeEquipo[]
  hallazgos: Hallazgo[]
  materiales: MaterialInforme[]
  fotos: FotoInforme[]
  cliente?: Cliente | null
  equipos: Equipo[]
  tecnico?: Tecnico | null
}

export async function generarInformePdf({
  informe, bloques, hallazgos, materiales, fotos, cliente, equipos, tecnico,
}: DatosInforme) {
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
    o: {
      fuente?: 'Archivo' | 'PlexMono'
      peso?: 'normal' | 'bold'
      tam?: number
      color?: [number, number, number]
      alinear?: 'left' | 'right'
    } = {},
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

  /** Salta de página antes de que el bloque siguiente quede cortado al pie. */
  const sitio = (alto: number) => {
    if (y + alto > ALTO - 26) {
      doc.addPage()
      y = MARGEN
    }
  }

  const titulo = (t: string) => {
    sitio(14)
    y += 3
    texto(t, MARGEN, y, { fuente: 'PlexMono', tam: 7, color: LATON })
    y += 2
    linea(y, LINEA, 0.2)
    y += 5
  }

  // ── Cabecera ──────────────────────────────────────────────────────────────
  doc.addImage(`data:image/png;base64,${logo}`, 'PNG', MARGEN, y, 46, 46 * (247 / 640))
  texto('INFORME DE CIERRE', ANCHO - MARGEN, y + 5, {
    fuente: 'PlexMono', tam: 8, color: LATON, alinear: 'right',
  })
  texto(informe.numero ?? '—', ANCHO - MARGEN, y + 11, {
    peso: 'bold', tam: 13, alinear: 'right',
  })
  texto(
    new Date(informe.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    ANCHO - MARGEN, y + 16, { tam: 8.5, color: MUT, alinear: 'right' },
  )

  y += 26
  linea(y, GRAFITO, 0.5)
  y += 8

  // ── Cliente y trabajo ─────────────────────────────────────────────────────
  texto('CLIENTE', MARGEN, y, { fuente: 'PlexMono', tam: 7, color: LATON })
  texto(cliente?.nombre ?? 'Sin cliente', MARGEN, y + 5.5, { peso: 'bold', tam: 11 })
  let ySub = y + 10.5
  for (const dato of [cliente?.rut, cliente?.direccion, cliente?.contacto_nombre].filter(Boolean)) {
    texto(String(dato), MARGEN, ySub, { tam: 8.5, color: MUT })
    ySub += 4.5
  }

  texto('TRABAJO', ANCHO - MARGEN, y, {
    fuente: 'PlexMono', tam: 7, color: LATON, alinear: 'right',
  })
  texto(TIPOS_INFORME[informe.tipo], ANCHO - MARGEN, y + 5.5, { tam: 10, alinear: 'right' })
  let yDer = y + 10.5
  const horario =
    informe.hora_entrada && informe.hora_salida
      ? `${informe.hora_entrada.slice(0, 5)} a ${informe.hora_salida.slice(0, 5)}`
      : null
  for (const dato of [horario, tecnico?.nombre].filter(Boolean)) {
    texto(String(dato), ANCHO - MARGEN, yDer, { tam: 8.5, color: MUT, alinear: 'right' })
    yDer += 4.5
  }

  y = Math.max(ySub, yDer) + 4

  // ── Resumen ───────────────────────────────────────────────────────────────
  if (informe.resumen) {
    titulo('LO QUE SE HIZO')
    for (const l of doc.splitTextToSize(informe.resumen, UTIL) as string[]) {
      sitio(6)
      texto(l, MARGEN, y, { tam: 9, color: MUT })
      y += 4.6
    }
    y += 2
  }

  // ── Un bloque por equipo ──────────────────────────────────────────────────
  for (const bloque of bloques) {
    const equipo = equipos.find(e => e.id === bloque.equipo_id)
    const nombre =
      bloque.descripcion ??
      [equipo && (TIPOS_EQUIPO[equipo.tipo] ?? equipo.tipo), equipo?.marca, equipo?.capacidad]
        .filter(Boolean)
        .join(' · ')

    sitio(20)
    y += 2
    doc.setFillColor(...GRAFITO)
    doc.rect(MARGEN, y, UTIL, 6.5, 'F')
    texto(nombre, MARGEN + 2.5, y + 4.5, { peso: 'bold', tam: 8.5, color: [255, 255, 255] })
    if (equipo?.ubicacion) {
      texto(equipo.ubicacion, ANCHO - MARGEN - 2.5, y + 4.5, {
        fuente: 'PlexMono', tam: 7, color: [255, 255, 255], alinear: 'right',
      })
    }
    y += 10

    if (bloque.trabajo.length > 0) {
      // Dos columnas: la lista de tareas es larga y angosta.
      const mitad = Math.ceil(bloque.trabajo.length / 2)
      const columnas = [bloque.trabajo.slice(0, mitad), bloque.trabajo.slice(mitad)]
      const yInicio = y
      let yMax = y
      columnas.forEach((columna, i) => {
        let yCol = yInicio
        const x = MARGEN + i * (UTIL / 2)
        for (const tarea of columna) {
          sitio(6)
          // El visto se dibuja con dos líneas y no con «✓»: la tipografía de la
          // marca no trae ese glifo y en el PDF no salía nada.
          doc.setDrawColor(...ACERO)
          doc.setLineWidth(0.45)
          doc.line(x, yCol - 1.5, x + 1, yCol - 0.5)
          doc.line(x + 1, yCol - 0.5, x + 2.8, yCol - 2.8)
          texto(tarea, x + 4.5, yCol, { tam: 8.5, color: MUT })
          yCol += 4.4
        }
        yMax = Math.max(yMax, yCol)
      })
      y = yMax + 1
    }

    const definiciones = [
      ...MEDICIONES_POR_FAMILIA[familiaDe(equipo)],
      ...MEDICIONES_CIRCUITO,
    ]
    const medidas = definiciones.filter(m => (bloque.mediciones ?? {})[m.clave])
    if (medidas.length > 0) {
      y += 1
      texto('MEDICIONES', MARGEN, y, { fuente: 'PlexMono', tam: 6.5, color: LATON })
      y += 4
      const porFila = 3
      for (let i = 0; i < medidas.length; i += porFila) {
        sitio(9)
        medidas.slice(i, i + porFila).forEach((m, j) => {
          const x = MARGEN + j * (UTIL / porFila)
          texto(m.etiqueta, x, y, { tam: 7, color: FAINT })
          texto(`${bloque.mediciones[m.clave]} ${m.unidad}`, x, y + 4, {
            fuente: 'PlexMono', tam: 9,
          })
        })
        y += 9
      }
    }

    const diagnostico: [string, string | null][] = [
      ['Lo que reporta el cliente', bloque.sintoma],
      ['Qué se descartó', bloque.descartado],
      ['Causa probable', bloque.causa],
    ]
    if (diagnostico.some(([, v]) => v)) {
      sitio(14)
      y += 1
      texto('DIAGNÓSTICO', MARGEN, y, { fuente: 'PlexMono', tam: 6.5, color: LATON })
      y += 4.5
      for (const [etiqueta, valor] of diagnostico) {
        if (!valor) continue
        const lineas = doc.splitTextToSize(valor, UTIL - 34) as string[]
        sitio(lineas.length * 4.4 + 2)
        texto(etiqueta, MARGEN, y, { tam: 7.5, color: FAINT })
        let yd = y
        for (const l of lineas) {
          texto(l, MARGEN + 34, yd, { tam: 8.5 })
          yd += 4.4
        }
        y = yd + 1.2
      }
      if (bloque.severidad) {
        texto(NIVELES_HALLAZGO[bloque.severidad].etiqueta, MARGEN, y, {
          tam: 8,
          color: bloque.severidad === 'urgente' ? ROJO : bloque.severidad === 'atencion' ? LATON : FAINT,
        })
        y += 5
      }
      y += 1
    }

    if (bloque.gas_tipo && (bloque.gas_recuperado || bloque.gas_cargado)) {
      sitio(10)
      const partes = [
        bloque.gas_recuperado ? `recuperados ${bloque.gas_recuperado} kg` : null,
        bloque.gas_cargado ? `cargados ${bloque.gas_cargado} kg` : null,
      ].filter(Boolean)
      texto('REFRIGERANTE', MARGEN, y, { fuente: 'PlexMono', tam: 6.5, color: LATON })
      y += 4
      texto(`${bloque.gas_tipo} · ${partes.join(' · ')}`, MARGEN, y, { tam: 9 })
      y += 4
      texto(
        'Gas recuperado a cilindro, no liberado a la atmósfera (NCh 3241-2017).',
        MARGEN, y, { tam: 7.5, color: FAINT },
      )
      y += 5
    }

    if (bloque.nota) {
      for (const l of doc.splitTextToSize(bloque.nota, UTIL) as string[]) {
        sitio(6)
        texto(l, MARGEN, y, { tam: 8.5, color: MUT })
        y += 4.4
      }
    }
    y += 3
  }

  // ── Hallazgos ─────────────────────────────────────────────────────────────
  if (hallazgos.length > 0) {
    titulo('HALLAZGOS')
    for (const h of hallazgos) {
      const color = h.nivel === 'urgente' ? ROJO : h.nivel === 'atencion' ? LATON : FAINT
      const lineas = doc.splitTextToSize(h.detalle, UTIL - 26) as string[]
      sitio(lineas.length * 4.4 + 4)
      texto(NIVELES_HALLAZGO[h.nivel].corta.toUpperCase(), MARGEN, y, {
        fuente: 'PlexMono', tam: 7, color,
      })
      let yh = y
      for (const l of lineas) {
        texto(l, MARGEN + 24, yh, { tam: 9, color: MUT })
        yh += 4.4
      }
      y = yh + 2
    }
  }

  // ── Materiales ────────────────────────────────────────────────────────────
  if (materiales.length > 0) {
    titulo('MATERIALES Y REPUESTOS')
    for (const m of materiales) {
      sitio(6)
      texto(m.descripcion, MARGEN, y, { tam: 9, color: MUT })
      texto(`${m.cantidad} ${m.unidad}`, ANCHO - MARGEN, y, {
        fuente: 'PlexMono', tam: 9, alinear: 'right',
      })
      y += 4.8
    }
  }

  // ── Recomendación ─────────────────────────────────────────────────────────
  if (informe.recomendacion || informe.proxima_visita) {
    titulo('RECOMENDACIÓN')
    if (informe.recomendacion) {
      for (const l of doc.splitTextToSize(informe.recomendacion, UTIL) as string[]) {
        sitio(6)
        texto(l, MARGEN, y, { tam: 9, color: MUT })
        y += 4.6
      }
    }
    if (informe.proxima_visita) {
      y += 1
      sitio(8)
      texto(`Próxima visita sugerida: ${fechaCorta(informe.proxima_visita)}`, MARGEN, y, {
        tam: 9, peso: 'bold',
      })
      y += 5
    }
  }

  // ── Fotos ─────────────────────────────────────────────────────────────────
  const conImagen: { foto: FotoInforme; dataUrl: string }[] = []
  for (const f of fotos) {
    const dataUrl = await leerFoto(f.ruta)
    if (dataUrl) conImagen.push({ foto: f, dataUrl })
  }
  if (conImagen.length > 0) {
    const anchoFoto = (UTIL - 6) / 2
    const altoFoto = anchoFoto * 0.72
    // El título tiene que saltar de página junto con la primera foto, o queda
    // anunciando algo que está en la hoja siguiente.
    sitio(altoFoto + 24)
    titulo('REGISTRO FOTOGRÁFICO')
    for (let i = 0; i < conImagen.length; i += 2) {
      sitio(altoFoto + 10)
      conImagen.slice(i, i + 2).forEach((item, j) => {
        const x = MARGEN + j * (anchoFoto + 6)
        try {
          doc.addImage(item.dataUrl, 'JPEG', x, y, anchoFoto, altoFoto)
        } catch {
          // Una foto ilegible no puede botar el informe completo.
        }
        texto(
          [MOMENTOS_FOTO[item.foto.momento], item.foto.nota].filter(Boolean).join(' · '),
          x, y + altoFoto + 4, { tam: 7.5, color: FAINT },
        )
      })
      y += altoFoto + 9
    }
  }

  // ── Cierre y firma ────────────────────────────────────────────────────────
  sitio(46)
  titulo('CONFORMIDAD')
  texto(
    informe.conforme === false
      ? 'El cliente recibe el trabajo con observaciones.'
      : 'El cliente recibe el trabajo conforme.',
    MARGEN, y, { tam: 9, color: MUT },
  )
  y += 8

  if (informe.firma) {
    try {
      doc.addImage(informe.firma, 'PNG', MARGEN, y, 60, 22)
    } catch {
      // Firma ilegible: queda la línea de todas formas.
    }
  }
  y += 24
  doc.setDrawColor(...GRAFITO)
  doc.setLineWidth(0.3)
  doc.line(MARGEN, y, MARGEN + 70, y)
  y += 4.5
  texto(informe.recibe_nombre ?? 'Nombre de quien recibe', MARGEN, y, { tam: 9 })
  if (informe.recibe_cargo) {
    y += 4.2
    texto(informe.recibe_cargo, MARGEN, y, { tam: 8, color: MUT })
  }

  // ── Pie, en todas las páginas ─────────────────────────────────────────────
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    linea(ALTO - 20, LINEA, 0.2)
    texto(
      'Calor y Frío Industrial SpA · R.U.T. 78.333.185-3 · Climatización · Refrigeración · Ventilación',
      MARGEN, ALTO - 15, { tam: 7.5, color: MUT },
    )
    texto(
      'Zanzibar Oriente 7473, Las Condes, Santiago · +56 9 9138 9110 · contacto@caloryfrioindustrial.cl · caloryfrioindustrial.cl',
      MARGEN, ALTO - 11.5, { tam: 7.5, color: FAINT },
    )
    if (paginas > 1) {
      texto(`${p} / ${paginas}`, ANCHO - MARGEN, ALTO - 11.5, {
        fuente: 'PlexMono', tam: 7.5, color: FAINT, alinear: 'right',
      })
    }
  }

  return doc.output('blob') as Blob
}
