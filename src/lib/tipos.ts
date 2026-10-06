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

/* ── Equipo e inventario ────────────────────────────────────────────────── */

export type Ambito = 'T' | 'E' | 'V'
export type EstadoExistencia = 'tiene' | 'falta' | 'agotado' | 'baja'
export type EstadoCotizacion = 'pedida' | 'recibida' | 'comprada' | 'descartada'

export interface Tecnico {
  id: string
  nombre: string
  rol: string | null
  telefono: string | null
  email: string | null
  usuario_id: string | null
  activo: boolean
  orden: number
  nota: string | null
  creado_en: string
}

export interface Insumo {
  id: string
  codigo: string
  nombre: string
  categoria: string
  ambito: Ambito
  unidad: string
  cantidad_objetivo: number
  critico: boolean
  consumible: boolean
  nota: string | null
  orden: number
  activo: boolean
}

export interface Existencia {
  id: string
  insumo_id: string
  tecnico_id: string | null
  estado: EstadoExistencia
  cantidad: number
  marca: string | null
  modelo: string | null
  serie: string | null
  valor: number | null
  ubicacion: string | null
  nota: string | null
  actualizado_en: string
}

export interface CotizacionInsumo {
  id: string
  insumo_id: string
  proveedor: string
  telefono: string | null
  url: string | null
  precio_neto: number | null
  cantidad: number
  fecha: string
  vence_el: string | null
  estado: EstadoCotizacion
  proveedor_id: string | null
  nota: string | null
  creado_en: string
}

/** De quién es cada cosa. Lo de ámbito «T» se repite por persona. */
export const AMBITOS: Record<Ambito, { etiqueta: string; corta: string }> = {
  T: { etiqueta: 'Uno por técnico', corta: 'Por técnico' },
  E: { etiqueta: 'De la empresa', corta: 'Taller' },
  V: { etiqueta: 'En la camioneta', corta: 'Camioneta' },
}

export const ESTADOS_EXISTENCIA: Record<
  EstadoExistencia,
  { etiqueta: string; corta: string; punto: string; pastilla: string; borde: string }
> = {
  tiene: {
    etiqueta: 'Lo tenemos', corta: 'Tenemos',
    punto: 'bg-verde', pastilla: 'bg-verde/12 text-verde', borde: 'border-l-verde',
  },
  falta: {
    etiqueta: 'Falta', corta: 'Falta',
    punto: 'bg-naranja', pastilla: 'bg-naranja/12 text-naranja', borde: 'border-l-naranja',
  },
  agotado: {
    etiqueta: 'Se acabó o se gastó', corta: 'Se acabó',
    punto: 'bg-laton', pastilla: 'bg-laton/12 text-laton-dk', borde: 'border-l-laton',
  },
  baja: {
    etiqueta: 'Dado de baja', corta: 'De baja',
    punto: 'bg-linea-2', pastilla: 'bg-tinte text-faint', borde: 'border-l-linea-2',
  },
}

/** Primero lo que hay que resolver; al final lo que ya no molesta. */
export const ORDEN_EXISTENCIA: EstadoExistencia[] = ['falta', 'agotado', 'tiene', 'baja']

export const ESTADOS_COTIZACION: Record<EstadoCotizacion, string> = {
  pedida: 'Pedida',
  recibida: 'Recibida',
  comprada: 'Comprada',
  descartada: 'Descartada',
}

/* ── Compras ────────────────────────────────────────────────────────────── */

export type EstadoOrden = 'borrador' | 'enviada' | 'recibida' | 'anulada'

export interface Proveedor {
  id: string
  nombre: string
  razon_social: string | null
  rut: string | null
  rubro: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  comuna: string | null
  web: string | null
  condiciones: string | null
  /** Cuánto dura una cotización suya. un distribuidor: tres días corridos. */
  validez_dias: number | null
  nota: string | null
  activo: boolean
  creado_en: string
}

export interface OrdenCompra {
  id: string
  numero: string | null
  proveedor_id: string | null
  fecha: string
  entrega_esperada: string | null
  estado: EstadoOrden
  nota: string | null
  creado_en: string
}

export interface LineaOrden {
  id: string
  orden_id: string
  insumo_id: string | null
  descripcion: string
  cantidad: number
  precio_neto: number
  orden: number
}

export const ESTADOS_ORDEN: Record<EstadoOrden, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  recibida: 'Recibida',
  anulada: 'Anulada',
}

/* ── Mantenciones programadas ───────────────────────────────────────────── */

export type EstadoMantencion = 'programada' | 'hecha' | 'reprogramada' | 'anulada'

export interface Mantencion {
  id: string
  cliente_id: string
  equipo_id: string | null
  contrato_id: string | null
  tecnico_id: string | null
  programada_el: string
  realizada_el: string | null
  estado: EstadoMantencion
  frecuencia_meses: number | null
  titulo: string | null
  nota: string | null
  creado_en: string
}

export const ESTADOS_MANTENCION: Record<EstadoMantencion, string> = {
  programada: 'Programada',
  hecha: 'Hecha',
  reprogramada: 'Reprogramada',
  anulada: 'Anulada',
}

/** Cada cuánto se vuelve. Son los intervalos que se venden, no cualquier número. */
export const FRECUENCIAS: [string, string][] = [
  ['', 'Sin repetición'],
  ['1', 'Cada mes'],
  ['2', 'Cada dos meses'],
  ['3', 'Cada tres meses'],
  ['4', 'Cada cuatro meses'],
  ['6', 'Cada seis meses'],
  ['12', 'Una vez al año'],
]

/* ── Informes de cierre ─────────────────────────────────────────────────── */

export type TipoInforme = 'preventiva' | 'correctivo' | 'instalacion' | 'diagnostico'
export type NivelHallazgo = 'observacion' | 'atencion' | 'urgente'
export type MomentoFoto = 'antes' | 'despues' | 'otro'

export interface Informe {
  id: string
  numero: string | null
  cliente_id: string | null
  mantencion_id: string | null
  tecnico_id: string | null
  tipo: TipoInforme
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
  resumen: string | null
  recomendacion: string | null
  proxima_visita: string | null
  recibe_nombre: string | null
  recibe_cargo: string | null
  conforme: boolean | null
  firma: string | null
  estado: 'borrador' | 'emitido'
  creado_en: string
}

export interface InformeEquipo {
  id: string
  informe_id: string
  equipo_id: string | null
  descripcion: string | null
  trabajo: string[]
  mediciones: Record<string, string>
  gas_tipo: string | null
  gas_recuperado: number | null
  gas_cargado: number | null
  nota: string | null
  orden: number
  /* El diagnóstico va por equipo: en un local con cuatro máquinas, tres
     pueden estar sanas y una no. */
  sintoma: string | null
  descartado: string | null
  causa: string | null
  severidad: NivelHallazgo | null
}

export interface Hallazgo {
  id: string
  informe_id: string
  equipo_id: string | null
  nivel: NivelHallazgo
  detalle: string
  presupuesto_id: string | null
}

export interface MaterialInforme {
  id: string
  informe_id: string
  insumo_id: string | null
  descripcion: string
  cantidad: number
  unidad: string
}

export interface FotoInforme {
  id: string
  informe_id: string
  equipo_id: string | null
  ruta: string
  momento: MomentoFoto
  nota: string | null
  orden: number
}

export const TIPOS_INFORME: Record<TipoInforme, string> = {
  preventiva: 'Mantención preventiva',
  correctivo: 'Correctivo',
  instalacion: 'Instalación',
  diagnostico: 'Diagnóstico',
}

export const NIVELES_HALLAZGO: Record<
  NivelHallazgo,
  { etiqueta: string; corta: string; pastilla: string }
> = {
  observacion: {
    etiqueta: 'Observación, para la próxima visita', corta: 'Observación',
    pastilla: 'bg-tinte text-mut',
  },
  atencion: {
    etiqueta: 'Requiere atención, hay que programarlo', corta: 'Atención',
    pastilla: 'bg-laton/12 text-laton-dk',
  },
  urgente: {
    etiqueta: 'Urgente, hay riesgo de falla o de seguridad', corta: 'Urgente',
    pastilla: 'bg-rojo/12 text-rojo',
  },
}

export const MOMENTOS_FOTO: Record<MomentoFoto, string> = {
  antes: 'Antes',
  despues: 'Después',
  otro: 'Otra',
}

/*
  La lista de lo que se hace y lo que se mide cambia con la máquina: un split
  no tiene deshielo y una cámara no entrega caudal. Por eso vive aquí como
  datos y no repartida en la pantalla.
*/
export type FamiliaEquipo = 'climatizacion' | 'refrigeracion' | 'ventilacion'

export const FAMILIAS: Record<FamiliaEquipo, string> = {
  climatizacion: 'Climatización',
  refrigeracion: 'Refrigeración comercial',
  ventilacion: 'Ventilación',
}

export const TAREAS_POR_FAMILIA: Record<FamiliaEquipo, string[]> = {
  climatizacion: [
    'Lavado de serpentín evaporador',
    'Lavado de serpentín condensador',
    'Filtros lavados',
    'Filtros cambiados',
    'Drenaje despejado y probado',
    'Bandeja limpia y desinfectada',
    'Aislación de cañería revisada',
    'Revisión eléctrica y de contactores',
    'Fijaciones y soportes revisados',
    'Control remoto y termostato probados',
  ],
  refrigeracion: [
    'Limpieza de condensador',
    'Limpieza de evaporador',
    'Deshielo y resistencias probados',
    'Burletes y cierre de puertas',
    'Desagüe de bandeja despejado',
    'Control de temperatura verificado',
    'Revisión eléctrica y de contactores',
    'Ventiladores y motores revisados',
  ],
  ventilacion: [
    'Filtros lavados o cambiados',
    'Correas revisadas o cambiadas',
    'Rodamientos lubricados',
    'Limpieza de rejillas y difusores',
    'Limpieza de ductos accesibles',
    'Revisión eléctrica del motor',
  ],
}

export const MEDICIONES_POR_FAMILIA: Record<
  FamiliaEquipo,
  { clave: string; etiqueta: string; unidad: string }[]
> = {
  climatizacion: [
    { clave: 'aire_entrada', etiqueta: 'Aire de entrada', unidad: '°C' },
    { clave: 'aire_salida', etiqueta: 'Aire de salida', unidad: '°C' },
    { clave: 'presion_baja', etiqueta: 'Presión de baja', unidad: 'psi' },
    { clave: 'presion_alta', etiqueta: 'Presión de alta', unidad: 'psi' },
    { clave: 'sobrecalentamiento', etiqueta: 'Sobrecalentamiento', unidad: 'K' },
    { clave: 'subenfriamiento', etiqueta: 'Subenfriamiento', unidad: 'K' },
    { clave: 'consumo', etiqueta: 'Consumo del compresor', unidad: 'A' },
    { clave: 'consumo_placa', etiqueta: 'Consumo de placa', unidad: 'A' },
    { clave: 'tension', etiqueta: 'Tensión', unidad: 'V' },
  ],
  refrigeracion: [
    { clave: 'consigna', etiqueta: 'Temperatura de consigna', unidad: '°C' },
    { clave: 'temperatura', etiqueta: 'Temperatura real', unidad: '°C' },
    { clave: 'evaporacion', etiqueta: 'Temperatura de evaporación', unidad: '°C' },
    { clave: 'condensacion', etiqueta: 'Temperatura de condensación', unidad: '°C' },
    { clave: 'sobrecalentamiento', etiqueta: 'Sobrecalentamiento', unidad: 'K' },
    { clave: 'consumo', etiqueta: 'Consumo del compresor', unidad: 'A' },
  ],
  ventilacion: [
    { clave: 'caudal', etiqueta: 'Caudal medido', unidad: 'm³/h' },
    { clave: 'velocidad', etiqueta: 'Velocidad en rejilla', unidad: 'm/s' },
    { clave: 'consumo', etiqueta: 'Consumo del motor', unidad: 'A' },
  ],
}

/**
 * Lo que se mide cuando se abre el circuito.
 *
 * Son los números del procedimiento del curso de la Unidad Ozono: nitrógeno a
 * 50 psi para la prueba de hermeticidad y vacío bajo 500 micrones. Van aparte
 * porque sólo aplican a correctivos e instalaciones.
 */
export const MEDICIONES_CIRCUITO = [
  { clave: 'nitrogeno_psi', etiqueta: 'Nitrógeno, presión de prueba', unidad: 'psi' },
  { clave: 'nitrogeno_min', etiqueta: 'Nitrógeno, tiempo sostenido', unidad: 'min' },
  { clave: 'vacio_micrones', etiqueta: 'Vacío alcanzado', unidad: 'micrones' },
  { clave: 'vacio_min', etiqueta: 'Vacío, tiempo', unidad: 'min' },
]

/* ── Documentos con vencimiento ─────────────────────────────────────────── */

export type AmbitoDocumento = 'empresa' | 'persona' | 'vehiculo'

export interface Documento {
  id: string
  nombre: string
  ambito: AmbitoDocumento
  tecnico_id: string | null
  emitido_el: string | null
  vence_el: string | null
  aviso_dias: number
  ubicacion: string | null
  nota: string | null
  archivado: boolean
  creado_en: string
}

export const AMBITOS_DOCUMENTO: Record<AmbitoDocumento, string> = {
  empresa: 'De la empresa',
  persona: 'De una persona',
  vehiculo: 'De la camioneta',
}

/**
 * Lo que una empresa como esta tiene que mantener al día.
 *
 * No vienen cargados con fecha: inventarle un vencimiento a un documento es
 * peor que no tenerlo anotado. Son sugerencias al agregar, para no quedarse
 * mirando un campo vacío sin saber qué poner.
 *
 * `aviso` es cuánto antes conviene empezar el trámite, y cambia mucho: la
 * patente municipal se renueva con holgura, un certificado de vigencia se pide
 * y llega el mismo día.
 */
export const DOCUMENTOS_SUGERIDOS: {
  nombre: string
  ambito: AmbitoDocumento
  aviso: number
  donde?: string
}[] = [
  { nombre: 'Patente comercial', ambito: 'empresa', aviso: 45, donde: '03 Municipal' },
  {
    nombre: 'Certificado de vigencia de la sociedad', ambito: 'empresa', aviso: 15,
    donde: '01 Legal y Societario/Certificados de Vigencia',
  },
  {
    nombre: 'Certificado digital para facturación', ambito: 'empresa', aviso: 60,
    donde: '02 Tributario y Contabilidad/Certificado Digital',
  },
  { nombre: 'Seguro de responsabilidad civil', ambito: 'empresa', aviso: 45 },
  { nombre: 'Registro de marca INAPI', ambito: 'empresa', aviso: 180 },
  { nombre: 'Permiso de circulación', ambito: 'vehiculo', aviso: 30 },
  { nombre: 'Revisión técnica y de gases', ambito: 'vehiculo', aviso: 30 },
  { nombre: 'Seguro obligatorio (SOAP)', ambito: 'vehiculo', aviso: 30 },
  { nombre: 'Seguro del vehículo', ambito: 'vehiculo', aviso: 30 },
  { nombre: 'Extintor con carga vigente', ambito: 'vehiculo', aviso: 30 },
  { nombre: 'Licencia de conducir', ambito: 'persona', aviso: 60 },
  { nombre: 'Certificación en refrigeración', ambito: 'persona', aviso: 90 },
  { nombre: 'Curso de trabajo en altura', ambito: 'persona', aviso: 60 },
  { nombre: 'Examen de altura física', ambito: 'persona', aviso: 60 },
]
