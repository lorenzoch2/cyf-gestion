import type { Equipo, FamiliaEquipo, NivelHallazgo } from './tipos'

/*
  Lectura de las mediciones.

  Dadas las mediciones de un equipo, esto propone qué puede estar pasando. No
  diagnostica: ordena lo que los números insinúan, con el porqué a la vista,
  para que el técnico confirme o descarte. Un sobrecalentamiento alto con
  subenfriamiento bajo apunta a falta de refrigerante, pero también puede ser
  una válvula de expansión mal regulada — eso lo decide quien está parado
  frente a la máquina, no una tabla.

  Por qué existe igual: el razonamiento de un buen técnico es consistente y se
  puede escribir. Tenerlo escrito sirve para tres cosas — que el informe
  explique en castellano por qué se propone un trabajo, que no se pase por alto
  lo evidente al final de un día largo, y que Francisco y Lorenzo lleguen a la
  misma conclusión frente a los mismos números.

  Los rangos vienen de la práctica corriente del oficio y del curso de Buenas
  Prácticas en Refrigeración y Climatización de la Unidad Ozono. Son
  orientación, no norma: un equipo puede estar sano fuera de rango y enfermo
  dentro.
*/

export interface Pista {
  nivel: NivelHallazgo
  titulo: string
  /** Qué medición la disparó. Va impresa para que se pueda discutir. */
  porque: string
  quehacer: string
}

function numero(mediciones: Record<string, string>, clave: string): number | null {
  const bruto = mediciones[clave]
  if (bruto === undefined || bruto === '') return null
  const n = Number(bruto)
  return Number.isFinite(n) ? n : null
}

/** Las reglas del circuito frigorífico, comunes a frío y clima. */
function pistasDelCircuito(m: Record<string, string>): Pista[] {
  const pistas: Pista[] = []
  const sh = numero(m, 'sobrecalentamiento')
  const sc = numero(m, 'subenfriamiento')

  if (sh !== null && sh < 3) {
    pistas.push({
      nivel: 'urgente',
      titulo: 'Riesgo de retorno de líquido al compresor',
      porque: `Sobrecalentamiento de ${sh} K; bajo 3 K el refrigerante puede llegar líquido a la aspiración.`,
      quehacer:
        'Revisar regulación de la válvula de expansión y carga. Un golpe de líquido parte el compresor, y el compresor es lo caro del equipo.',
    })
  }

  if (sh !== null && sc !== null) {
    if (sh > 12 && sc < 3) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'Parece faltar refrigerante',
        porque: `Sobrecalentamiento alto (${sh} K) con subenfriamiento bajo (${sc} K): el evaporador se queda sin líquido y el condensador no alcanza a acumularlo.`,
        quehacer:
          'Buscar fuga antes de cargar. Cargar sobre una fuga es pagar el gas dos veces y liberarlo a la atmósfera.',
      })
    } else if (sh < 5 && sc > 12) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'Parece haber exceso de carga',
        porque: `Subenfriamiento alto (${sc} K) con sobrecalentamiento bajo (${sh} K).`,
        quehacer:
          'Recuperar refrigerante a cilindro y volver a pesar la carga. Nunca liberarlo (NCh 3241-2017).',
      })
    } else if (sh > 12 && sc > 10) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'Parece haber una restricción en la línea de líquido',
        porque: `Sobrecalentamiento y subenfriamiento altos a la vez (${sh} K y ${sc} K): el líquido se acumula antes de un estrangulamiento.`,
        quehacer:
          'Revisar filtro secador —si está frío o escarchado por un lado, está tapado— y la válvula de expansión.',
      })
    }
  }

  const consumo = numero(m, 'consumo')
  const placa = numero(m, 'consumo_placa')
  if (consumo !== null && placa !== null && placa > 0) {
    const razon = consumo / placa
    if (razon > 1.1) {
      pistas.push({
        nivel: 'urgente',
        titulo: 'El compresor consume más de lo que dice su placa',
        porque: `${consumo} A medidos contra ${placa} A de placa, un ${Math.round((razon - 1) * 100)}% por encima.`,
        quehacer:
          'Revisar presión de condensación, limpieza del condensador, tensión de alimentación y capacitor. Trabajando así, el compresor se quema.',
      })
    } else if (razon < 0.6) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'El compresor consume menos de lo esperado',
        porque: `${consumo} A contra ${placa} A de placa.`,
        quehacer:
          'Suele ser falta de carga o válvulas del compresor en mal estado. Confirmar con presiones antes de concluir.',
      })
    }
  }

  const tension = numero(m, 'tension')
  if (tension !== null && (tension < 198 || tension > 242)) {
    pistas.push({
      nivel: 'urgente',
      titulo: 'Tensión fuera de rango',
      porque: `${tension} V medidos; para 220 V nominales el rango de trabajo seguro es 198 a 242 V.`,
      quehacer:
        'Es un problema de la instalación del local, no del equipo, pero se lleva el compresor igual. Dejarlo por escrito en el informe.',
    })
  }

  return pistas
}

function pistasDeClima(m: Record<string, string>): Pista[] {
  const pistas: Pista[] = []
  const entrada = numero(m, 'aire_entrada')
  const salida = numero(m, 'aire_salida')

  if (entrada !== null && salida !== null) {
    const delta = Math.round((entrada - salida) * 10) / 10
    if (delta < 8) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'El equipo enfría poco',
        porque: `Sólo ${delta} K entre el aire que entra y el que sale; lo corriente en un split sano son 8 a 12 K.`,
        quehacer:
          'Las dos causas habituales son falta de refrigerante y evaporador o filtros tapados. Las presiones distinguen una de otra.',
      })
    } else if (delta > 15) {
      pistas.push({
        nivel: 'atencion',
        titulo: 'Pasa poco aire por el evaporador',
        porque: `${delta} K de salto térmico, por encima de lo corriente: el aire se enfría de más porque circula poco.`,
        quehacer:
          'Revisar filtros, aletas del evaporador y velocidad del ventilador. Con poco caudal el evaporador termina escarchando.',
      })
    }
  }

  return pistas
}

function pistasDeFrio(m: Record<string, string>): Pista[] {
  const pistas: Pista[] = []
  const consigna = numero(m, 'consigna')
  const real = numero(m, 'temperatura')
  const condensacion = numero(m, 'condensacion')

  if (consigna !== null && real !== null && real - consigna > 5) {
    pistas.push({
      nivel: 'atencion',
      titulo: 'No alcanza la temperatura pedida',
      porque: `Consigna en ${consigna} °C y la máquina está en ${real} °C, ${Math.round((real - consigna) * 10) / 10} K por encima.`,
      quehacer:
        'Revisar carga, escarcha en el evaporador, funcionamiento del deshielo y cierre de puertas. En un local con comida esto además es un problema sanitario del cliente.',
    })
  }

  if (condensacion !== null && condensacion > 50) {
    pistas.push({
      nivel: 'atencion',
      titulo: 'Condensa demasiado caliente',
      porque: `${condensacion} °C de temperatura de condensación. Lo corriente es entre 10 y 15 K sobre la temperatura del lugar donde está el condensador.`,
      quehacer:
        'Casi siempre es condensador sucio o mal ventilado; a veces, exceso de carga o aire dentro del circuito. Es lo que más sube la cuenta de la luz del cliente.',
    })
  }

  return pistas
}

/** Lo que se mide al abrir el circuito, en correctivos e instalaciones. */
function pistasDeVacio(m: Record<string, string>): Pista[] {
  const pistas: Pista[] = []
  const micrones = numero(m, 'vacio_micrones')
  const nitrogeno = numero(m, 'nitrogeno_psi')

  if (micrones !== null && micrones > 500) {
    pistas.push({
      nivel: micrones > 2000 ? 'urgente' : 'atencion',
      titulo: 'El vacío no llegó a donde debía',
      porque: `${micrones} micrones alcanzados; el procedimiento pide bajar de 500.`,
      quehacer:
        'O queda humedad, o hay una fuga, o la bomba necesita aceite. Cargar sobre un vacío incompleto mete agua al circuito y termina en ácido.',
    })
  }

  if (nitrogeno !== null && nitrogeno < 50) {
    pistas.push({
      nivel: 'observacion',
      titulo: 'Prueba de hermeticidad por debajo de lo habitual',
      porque: `${nitrogeno} psi; el procedimiento del curso usa 50 psi de nitrógeno seco.`,
      quehacer: 'Repetir la prueba a la presión correcta antes de dar el circuito por bueno.',
    })
  }

  return pistas
}

/** Todo junto, en el orden en que conviene leerlo: lo urgente primero. */
export function leerMediciones(
  familia: FamiliaEquipo,
  mediciones: Record<string, string> | null | undefined,
): Pista[] {
  const m = mediciones ?? {}
  const pistas = [
    ...pistasDelCircuito(m),
    ...(familia === 'climatizacion' ? pistasDeClima(m) : []),
    ...(familia === 'refrigeracion' ? pistasDeFrio(m) : []),
    ...pistasDeVacio(m),
  ]
  const peso: Record<NivelHallazgo, number> = { urgente: 0, atencion: 1, observacion: 2 }
  return pistas.sort((a, b) => peso[a.nivel] - peso[b.nivel])
}

/* ── Comparación con la visita anterior ─────────────────────────────────── */

export interface Cambio {
  clave: string
  etiqueta: string
  unidad: string
  antes: number
  ahora: number
  variacion: number
  /** Un cambio chico es ruido de medición; sólo se muestra lo que significa algo. */
  relevante: boolean
}

/**
 * Qué se movió desde la vez pasada.
 *
 * Es lo que convierte una medición en un argumento: «el consumo de este
 * compresor pasó de 7,2 A en abril a 9,4 A hoy» convence a un cliente de
 * cambiar un equipo mucho mejor que una opinión.
 */
export function compararMediciones(
  definiciones: { clave: string; etiqueta: string; unidad: string }[],
  antes: Record<string, string> | null | undefined,
  ahora: Record<string, string> | null | undefined,
): Cambio[] {
  const cambios: Cambio[] = []
  for (const d of definiciones) {
    const a = numero(antes ?? {}, d.clave)
    const b = numero(ahora ?? {}, d.clave)
    if (a === null || b === null) continue
    const variacion = Math.round((b - a) * 10) / 10
    // Un 10% o un punto entero: por debajo de eso es la mano, no la máquina.
    const relevante = Math.abs(variacion) >= Math.max(1, Math.abs(a) * 0.1)
    cambios.push({ ...d, antes: a, ahora: b, variacion, relevante })
  }
  return cambios
}

/** La familia manda qué se mide; se deduce del tipo de equipo. */
export function familiaDe(equipo?: Equipo | null): FamiliaEquipo {
  const t = (equipo?.tipo ?? '').toLowerCase()
  if (/c[aá]mara|visicooler|congelad|mostrador|vitrina|refriger|hielo/.test(t)) {
    return 'refrigeracion'
  }
  if (/ventila|extractor|inyect|ducto|campana/.test(t)) return 'ventilacion'
  return 'climatizacion'
}
