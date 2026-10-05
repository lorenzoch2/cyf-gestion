/** Las filas de la base, tal como las devuelve Supabase, y sus etiquetas. */

export type Prioridad = 'alta' | 'media' | 'baja'
export type EstadoProspecto =
  | 'por_visitar' | 'visitado' | 'interesado' | 'evaluacion' | 'cotizado' | 'cliente' | 'descartado'
export type Etapa = 'nueva' | 'evaluacion' | 'cotizada' | 'negociacion' | 'ganada' | 'perdida'
export type TipoVisita = 'prospeccion' | 'evaluacion' | 'mantencion' | 'correctivo' | 'instalacion'
export type PlanContrato = 'trimestral' | 'semestral' | 'anual' | 'por_evento'
export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aceptado' | 'rechazado'
export type CategoriaServicio = 'climatizacion' | 'refrigeracion' | 'adicional'
export type TipoTarifario = 'base' | 'zona' | 'cliente'
export type EstadoRuta = 'planificada' | 'en_curso' | 'terminada'

export interface Cliente {
  id: string
  nombre: string
  rut: string | null
  direccion: string | null
  comuna: string | null
  contacto_nombre: string | null
  contacto_cargo: string | null
  telefono: string | null
  email: string | null
  lat: number | null
  lng: number | null
  notas: string | null
  creado_en: string
}

export interface Prospecto {
  id: string
  nombre: string
  rubro: string | null
  zona: string | null
  direccion: string | null
  comuna: string | null
  equipos_esperados: string | null
  prioridad: Prioridad
  estado: EstadoProspecto
  telefono: string | null
  horario: string | null
  lat: number | null
  lng: number | null
  contacto_nombre: string | null
  contacto_cargo: string | null
  resultado: string | null
  proximo_paso: string | null
  proximo_paso_en: string | null
  visitado_en: string | null
  equipos_declarados: number | null
  notas: string | null
  cliente_id: string | null
  ruta_id: string | null
  origen: 'osm' | 'manual'
}

export interface Ruta {
  id: string
  nombre: string
  zona: string | null
  fecha: string | null
  notas: string | null
  estado: EstadoRuta
  creado_en: string
}

export interface Equipo {
  id: string
  cliente_id: string
  tipo: string
  descripcion: string | null
  marca: string | null
  modelo: string | null
  capacidad: string | null
  refrigerante: string | null
  ubicacion: string | null
  ultima_mantencion: string | null
  notas: string | null
}

export interface Contrato {
  id: string
  cliente_id: string
  plan: PlanContrato
  visitas_al_anio: number | null
  valor_visita_neto: number | null
  valor_mensual_neto: number | null
  inicio: string | null
  fin: string | null
  proxima_visita: string | null
  estado: 'activo' | 'pausado' | 'terminado'
  notas: string | null
}

export interface Visita {
  id: string
  fecha: string
  tipo: TipoVisita
  cliente_id: string | null
  prospecto_id: string | null
  resumen: string | null
  proximo_paso: string | null
  proximo_paso_en: string | null
}

export interface Oportunidad {
  id: string
  titulo: string
  cliente_id: string | null
  prospecto_id: string | null
  etapa: Etapa
  monto_neto: number | null
  cierre_estimado: string | null
  presupuesto_numero: string | null
  motivo_cierre: string | null
  notas: string | null
  actualizado_en: string
}

export interface Tarea {
  id: string
  titulo: string
  detalle: string | null
  vence_en: string | null
  hecha: boolean
  hecha_en: string | null
  cliente_id: string | null
  prospecto_id: string | null
  oportunidad_id: string | null
}

export interface Servicio {
  id: string
  categoria: CategoriaServicio
  nombre: string
  unidad: string
  precio_neto: number
  orden: number
  activo: boolean
}

export interface Tarifario {
  id: string
  nombre: string
  tipo: TipoTarifario
  zona: string | null
  cliente_id: string | null
  notas: string | null
  activo: boolean
}

export interface PrecioTarifario {
  id: string
  tarifario_id: string
  servicio_id: string
  precio_neto: number
}

export interface Presupuesto {
  id: string
  numero: string | null
  titulo: string | null
  cliente_id: string | null
  prospecto_id: string | null
  oportunidad_id: string | null
  fecha: string
  estado: EstadoPresupuesto
  descuento_pct: number
  notas: string | null
}

export interface LineaPresupuesto {
  id: string
  presupuesto_id: string
  descripcion: string
  cantidad: number
  precio_unitario_neto: number
  orden: number
}

/* ── Etiquetas y colores ────────────────────────────────────────────────── */

export const ZONAS: Record<string, string> = {
  egana: 'Plaza Egaña',
  nunoa: 'Plaza Ñuñoa',
  irarrazaval: 'Metro Irarrázabal',
}

/**
 * Estado de gestión de un local: dónde va la conversación.
 *
 * El color es el mismo en la lista, en la ficha y —cuando llegue— en el mapa:
 * un local amarillo es un local interesado, se mire donde se mire.
 */
export interface PintaEstado {
  etiqueta: string
  corta: string
  punto: string
  pastilla: string
  borde: string
}

export const ESTADOS_PROSPECTO: Record<EstadoProspecto, PintaEstado> = {
  por_visitar: {
    etiqueta: 'Por visitar', corta: 'Por visitar',
    punto: 'bg-faint', pastilla: 'bg-tinte text-mut', borde: 'border-l-faint',
  },
  visitado: {
    etiqueta: 'Visitado, sin definir', corta: 'Visitado',
    punto: 'bg-acero', pastilla: 'bg-acero/12 text-acero-dk', borde: 'border-l-acero',
  },
  interesado: {
    etiqueta: 'Interesado', corta: 'Interesado',
    punto: 'bg-laton', pastilla: 'bg-laton/18 text-laton-dk', borde: 'border-l-laton',
  },
  evaluacion: {
    etiqueta: 'Evaluación agendada', corta: 'Evaluación',
    punto: 'bg-morado', pastilla: 'bg-morado/12 text-morado', borde: 'border-l-morado',
  },
  cotizado: {
    etiqueta: 'Cotizado, esperando', corta: 'Cotizado',
    punto: 'bg-naranja', pastilla: 'bg-naranja/12 text-naranja', borde: 'border-l-naranja',
  },
  cliente: {
    etiqueta: 'Cliente', corta: 'Cliente',
    punto: 'bg-verde', pastilla: 'bg-verde/12 text-verde', borde: 'border-l-verde',
  },
  descartado: {
    etiqueta: 'Descartado', corta: 'Descartado',
    punto: 'bg-linea-2', pastilla: 'bg-tinte text-faint', borde: 'border-l-linea-2',
  },
}

/**
 * El mismo color, en hexadecimal, para el mapa.
 *
 * Leaflet pinta con valores, no con clases de Tailwind, así que la paleta de
 * estados vive dos veces. Si cambia uno, cambia el otro.
 */
export const COLOR_ESTADO: Record<EstadoProspecto, string> = {
  por_visitar: '#838c99',
  visitado: '#4f73a8',
  interesado: '#a9803f',
  evaluacion: '#6b4fa8',
  cotizado: '#c2560f',
  cliente: '#2f7d58',
  descartado: '#ccd3dd',
}

/** El orden en que se muestran: sigue el avance de la conversación. */
export const ORDEN_ESTADOS: EstadoProspecto[] = [
  'por_visitar', 'visitado', 'interesado', 'evaluacion', 'cotizado', 'cliente', 'descartado',
]

export const ESTADOS_RUTA: Record<EstadoRuta, string> = {
  planificada: 'Planificada',
  en_curso: 'En curso',
  terminada: 'Terminada',
}

export const ETAPAS: Record<Etapa, string> = {
  nueva: 'Nueva',
  evaluacion: 'En evaluación',
  cotizada: 'Cotizada',
  negociacion: 'En negociación',
  ganada: 'Ganada',
  perdida: 'Perdida',
}

export const ETAPAS_ABIERTAS: Etapa[] = ['nueva', 'evaluacion', 'cotizada', 'negociacion']

export const TIPOS_VISITA: Record<TipoVisita, string> = {
  prospeccion: 'Prospección',
  evaluacion: 'Evaluación',
  mantencion: 'Mantención',
  correctivo: 'Correctivo',
  instalacion: 'Instalación',
}

export const TIPOS_EQUIPO: Record<string, string> = {
  split_muro: 'Split muro',
  piso_cielo: 'Piso-cielo',
  cassette: 'Cassette',
  multisplit: 'Multisplit',
  ducto: 'Ducto',
  visicooler: 'Visicooler',
  vitrina: 'Vitrina refrigerada',
  congeladora: 'Congeladora',
  camara_frio: 'Cámara de frío',
  maquina_hielo: 'Máquina de hielo',
  otro: 'Otro',
}

export const RUBROS: string[] = [
  'Minimarket', 'Supermercado', 'Botillería', 'Carnicería', 'Pescadería', 'Verdulería',
  'Panadería', 'Pastelería', 'Restaurante', 'Comida rápida', 'Café', 'Bar', 'Pub',
  'Heladería', 'Delicatessen', 'Congelados', 'Otro',
]

export const PLANES: Record<PlanContrato, string> = {
  trimestral: 'Trimestral (4 visitas al año)',
  semestral: 'Semestral (2 visitas al año)',
  anual: 'Anual (1 visita al año)',
  por_evento: 'Por evento',
}

export const ESTADOS_PRESUPUESTO: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
}

export const CATEGORIAS: Record<CategoriaServicio, string> = {
  climatizacion: 'Climatización',
  refrigeracion: 'Refrigeración comercial',
  adicional: 'Servicios adicionales',
}

export const TIPOS_TARIFARIO: Record<TipoTarifario, string> = {
  base: 'General',
  zona: 'Por zona',
  cliente: 'Por cliente',
}
