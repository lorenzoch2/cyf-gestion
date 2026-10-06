import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Area, Boton, Campo, Cargando, Confirmar, Hoja, Pantalla, Selector, Tarjeta,
} from '../componentes/ui'
import { Conformidad, Firma } from '../componentes/Firma'
import {
  borrarFotoFila, borrarHallazgo, borrarInforme, borrarInformeEquipo, borrarMaterial,
  consultarCatalogo, consultarCliente, consultarEquipos, consultarFotos, consultarHallazgos,
  consultarInforme, consultarInformeEquipos, consultarMateriales, crearFoto, crearHallazgo,
  crearInformeEquipo, crearMaterial, emitirInforme, guardarInforme, guardarInformeEquipo,
  historialEquipo, useConsulta,
} from '../lib/datos'
import { borrarFoto, leerFoto, subirFoto } from '../lib/fotos'
import { compararMediciones, familiaDe, leerMediciones } from '../lib/diagnostico'
import { fechaCorta } from '../lib/formato'
import {
  MEDICIONES_CIRCUITO, MEDICIONES_POR_FAMILIA, MOMENTOS_FOTO, NIVELES_HALLAZGO,
  TAREAS_POR_FAMILIA, TIPOS_EQUIPO, TIPOS_INFORME,
  type Cliente, type Equipo, type FotoInforme, type Hallazgo, type Informe,
  type InformeEquipo, type Insumo, type MaterialInforme, type MomentoFoto, type NivelHallazgo,
} from '../lib/tipos'

/*
  La pantalla donde se arma el informe, en terreno.

  Va por secciones apiladas y no por pestañas: en el local se llena de arriba
  abajo una sola vez, y una pestaña escondida es una sección que no se llena.

  Las mediciones están plegadas por defecto. Son opcionales a propósito —hoy
  faltan la pinza amperimétrica, el vacuómetro y el anemómetro— y un formulario
  obligatorio que no se puede llenar termina con gente inventando números.
*/

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">{titulo}</h2>
      {children}
    </section>
  )
}

/** Una fila del historial del equipo, con el informe al que pertenece. */
interface FilaHistorial extends InformeEquipo {
  informe: { id: string; numero: string | null; fecha: string; tipo: string } | null
}

export function InformeDetalle() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const [hoja, setHoja] = useState<'equipo' | 'hallazgo' | 'material' | null>(null)
  const [confirmando, setConfirmando] = useState<'emitir' | 'borrar' | null>(null)
  const [aviso, setAviso] = useState('')
  const [generando, setGenerando] = useState(false)

  const informe = useConsulta<Informe>(() => consultarInforme(id), [id])
  const bloques = useConsulta<InformeEquipo[]>(() => consultarInformeEquipos(id), [id])
  const hallazgos = useConsulta<Hallazgo[]>(() => consultarHallazgos(id), [id])
  const materiales = useConsulta<MaterialInforme[]>(() => consultarMateriales(id), [id])
  const fotos = useConsulta<FotoInforme[]>(() => consultarFotos(id), [id])

  const i = informe.datos

  /*
    El cliente llega en el informe, así que estas dos consultas corren una
    primera vez sin tener a quién preguntar. Pedirle a la base por un id vacío
    no devuelve nada útil y además responde 400 —el id es un uuid—, así que se
    espera: sin cliente, resultado vacío y sin viaje.
  */
  const vacio = <T,>() => Promise.resolve({ data: null as T | null, error: null })
  const cliente = useConsulta<Cliente>(
    () => (i?.cliente_id ? consultarCliente(i.cliente_id) : vacio<Cliente>()),
    [i?.cliente_id],
  )
  const equipos = useConsulta<Equipo[]>(
    () => (i?.cliente_id ? consultarEquipos(i.cliente_id) : vacio<Equipo[]>()),
    [i?.cliente_id],
  )

  const bloqueado = i?.estado === 'emitido'

  async function guardar(cambios: Partial<Informe>) {
    await guardarInforme(id, cambios)
    void informe.recargar()
  }

  async function compartir() {
    if (!i) return
    setGenerando(true)
    try {
      // jsPDF y las tipografías incrustadas son 130 KB comprimidos: entran al
      // pedir el PDF, no al abrir la pantalla en medio de un local.
      const [{ generarInformePdf }, { compartirPdf }] = await Promise.all([
        import('../lib/informePdf'),
        import('../lib/pdf'),
      ])
      const blob = await generarInformePdf({
        informe: i,
        bloques: bloques.datos ?? [],
        hallazgos: hallazgos.datos ?? [],
        materiales: materiales.datos ?? [],
        fotos: fotos.datos ?? [],
        cliente: cliente.datos,
        equipos: equipos.datos ?? [],
      })
      await compartirPdf(blob, `Informe ${i.numero ?? ''} - Calor y Frio Industrial.pdf`)
    } finally {
      setGenerando(false)
    }
  }

  if (informe.cargando) return <Cargando />
  if (!i) {
    return (
      <Pantalla titulo="Informe" volver>
        No se encontró el informe.
      </Pantalla>
    )
  }

  return (
    <Pantalla
      titulo={cliente.datos?.nombre ?? 'Informe'}
      bajada={`IC ${i.numero ?? '—'} · ${TIPOS_INFORME[i.tipo]} · ${
        bloqueado ? 'emitido' : 'borrador'
      }`}
      volver
    >
      <div className="space-y-6">
        {bloqueado && (
          <Tarjeta className="bg-verde/8 p-3">
            <p className="text-sm">
              Emitido el {fechaCorta(i.fecha)}. Queda como está; para corregir algo, se emite otro.
            </p>
          </Tarjeta>
        )}

        <Seccion titulo="La visita">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Campo
                etiqueta="Entrada"
                type="time"
                disabled={bloqueado}
                defaultValue={i.hora_entrada ?? ''}
                onBlur={e => void guardar({ hora_entrada: e.target.value || null })}
              />
              <Campo
                etiqueta="Salida"
                type="time"
                disabled={bloqueado}
                defaultValue={i.hora_salida ?? ''}
                onBlur={e => void guardar({ hora_salida: e.target.value || null })}
              />
            </div>
            <Area
              etiqueta="Qué se hizo"
              disabled={bloqueado}
              defaultValue={i.resumen ?? ''}
              onBlur={e => void guardar({ resumen: e.target.value || null })}
            />
          </div>
        </Seccion>

        <Seccion titulo="Equipos">
          <div className="space-y-2">
            {(bloques.datos ?? []).map(b => (
              <BloqueEquipo
                key={b.id}
                bloque={b}
                equipo={equipos.datos?.find(e => e.id === b.equipo_id) ?? null}
                fecha={i.fecha}
                bloqueado={bloqueado}
                alGuardar={() => void bloques.recargar()}
              />
            ))}
            {!bloqueado && (
              <Boton className="w-full" onClick={() => setHoja('equipo')}>
                Agregar equipo
              </Boton>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Hallazgos">
          <div className="space-y-2">
            {(hallazgos.datos ?? []).map(h => (
              <Tarjeta key={h.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${
                        NIVELES_HALLAZGO[h.nivel].pastilla
                      }`}
                    >
                      {NIVELES_HALLAZGO[h.nivel].corta}
                    </span>
                    <p className="mt-1.5 text-sm">{h.detalle}</p>
                  </div>
                  {!bloqueado && (
                    <button
                      onClick={async () => {
                        await borrarHallazgo(h.id)
                        void hallazgos.recargar()
                      }}
                      className="shrink-0 text-xs text-faint"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </Tarjeta>
            ))}
            {!bloqueado && (
              <Boton className="w-full" onClick={() => setHoja('hallazgo')}>
                Agregar hallazgo
              </Boton>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Materiales usados">
          <div className="space-y-2">
            {(materiales.datos ?? []).map(m => (
              <Tarjeta key={m.id} className="flex items-center justify-between gap-2 p-3">
                <p className="min-w-0 truncate text-sm">{m.descripcion}</p>
                <span className="shrink-0 font-mono text-xs text-faint">
                  {m.cantidad} {m.unidad}
                </span>
                {!bloqueado && (
                  <button
                    onClick={async () => {
                      await borrarMaterial(m.id)
                      void materiales.recargar()
                    }}
                    className="shrink-0 text-xs text-faint"
                  >
                    Quitar
                  </button>
                )}
              </Tarjeta>
            ))}
            {!bloqueado && (
              <Boton className="w-full" onClick={() => setHoja('material')}>
                Agregar material
              </Boton>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Fotos">
          <Fotos
            informeId={id}
            fotos={fotos.datos ?? []}
            bloqueado={bloqueado}
            alCambiar={() => void fotos.recargar()}
          />
        </Seccion>

        <Seccion titulo="Recomendación">
          <div className="space-y-2">
            <Area
              etiqueta="Qué conviene hacer"
              disabled={bloqueado}
              defaultValue={i.recomendacion ?? ''}
              onBlur={e => void guardar({ recomendacion: e.target.value || null })}
            />
            <Campo
              etiqueta="Próxima visita sugerida"
              type="date"
              disabled={bloqueado}
              defaultValue={i.proxima_visita ?? ''}
              onBlur={e => void guardar({ proxima_visita: e.target.value || null })}
            />
          </div>
        </Seccion>

        <Seccion titulo="Conformidad">
          <div className="space-y-3">
            <Conformidad
              valor={i.conforme}
              alCambiar={v => void guardar({ conforme: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Campo
                etiqueta="Quién recibe"
                disabled={bloqueado}
                defaultValue={i.recibe_nombre ?? ''}
                onBlur={e => void guardar({ recibe_nombre: e.target.value || null })}
              />
              <Campo
                etiqueta="Cargo"
                disabled={bloqueado}
                defaultValue={i.recibe_cargo ?? ''}
                onBlur={e => void guardar({ recibe_cargo: e.target.value || null })}
              />
            </div>
            {!bloqueado ? (
              <Firma valor={i.firma} alCambiar={f => void guardar({ firma: f })} />
            ) : (
              i.firma && (
                <img
                  src={i.firma}
                  alt="Firma"
                  className="h-28 w-full rounded-lg border border-linea bg-white object-contain"
                />
              )
            )}
          </div>
        </Seccion>

        {aviso && <p className="text-sm text-mut">{aviso}</p>}

        <div className="space-y-2">
          <Boton
            variante="acento"
            className="w-full"
            disabled={generando}
            onClick={() => void compartir()}
          >
            {generando ? 'Armando el PDF…' : 'Compartir el PDF'}
          </Boton>
          {!bloqueado && (
            <Boton className="w-full" onClick={() => setConfirmando('emitir')}>
              Emitir informe
            </Boton>
          )}
          <Boton variante="peligro" className="w-full" onClick={() => setConfirmando('borrar')}>
            Borrar informe
          </Boton>
        </div>
      </div>

      <HojaAgregarEquipo
        abierta={hoja === 'equipo'}
        informeId={id}
        equipos={equipos.datos ?? []}
        usados={(bloques.datos ?? []).map(b => b.equipo_id)}
        alCerrar={() => setHoja(null)}
        alGuardar={() => void bloques.recargar()}
      />

      <HojaHallazgo
        abierta={hoja === 'hallazgo'}
        informeId={id}
        alCerrar={() => setHoja(null)}
        alGuardar={() => void hallazgos.recargar()}
      />

      <HojaMaterial
        abierta={hoja === 'material'}
        informeId={id}
        alCerrar={() => setHoja(null)}
        alGuardar={() => void materiales.recargar()}
      />

      <Confirmar
        abierta={confirmando === 'emitir'}
        titulo="Emitir el informe"
        detalle="Queda cerrado y no se puede seguir editando. Los materiales usados bajan del inventario, y si venía de una mantención programada, esa queda cerrada con la siguiente ya agendada."
        textoAceptar="Emitir"
        alAceptar={() => {
          void emitirInforme(i, materiales.datos ?? [], null).then(() => {
            setAviso('Informe emitido.')
            void informe.recargar()
          })
        }}
        alCerrar={() => setConfirmando(null)}
      />

      <Confirmar
        abierta={confirmando === 'borrar'}
        titulo="Borrar el informe"
        detalle="Se borra el informe completo con sus equipos, hallazgos y fotos. No se puede deshacer."
        textoAceptar="Borrar"
        peligro
        alAceptar={() => {
          // Las fotos viven en el almacenamiento y no las arrastra el borrado en
          // cascada de la base: si no se sacan aquí, quedan ocupando espacio sin
          // que nada las referencie.
          void (async () => {
            for (const f of fotos.datos ?? []) await borrarFoto(f.ruta)
            await borrarInforme(id)
            navegar('/informes')
          })()
        }}
        alCerrar={() => setConfirmando(null)}
      />
    </Pantalla>
  )
}

/* ── El bloque de un equipo ─────────────────────────────────────────────── */

function BloqueEquipo({
  bloque,
  equipo,
  fecha,
  bloqueado,
  alGuardar,
}: {
  bloque: InformeEquipo
  equipo: Equipo | null
  fecha: string
  bloqueado: boolean
  alGuardar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [midiendo, setMidiendo] = useState(false)
  const familia = familiaDe(equipo)
  const tareas = TAREAS_POR_FAMILIA[familia]
  const mediciones = [...MEDICIONES_POR_FAMILIA[familia], ...MEDICIONES_CIRCUITO]

  /*
    Lo marcado vive en una referencia y no sólo en las props.

    Tocar tres mediciones seguidas dispara tres guardados casi a la vez, y si
    cada uno arma el objeto a partir de las props —que todavía no se han
    recargado— el último pisa a los dos anteriores. Con la referencia cada
    guardado parte de lo que dejó el anterior. Pasó de verdad: de tres
    mediciones llegó una sola a la base.
  */
  const vivo = useRef({
    trabajo: bloque.trabajo ?? [],
    mediciones: bloque.mediciones ?? {},
  })
  const [vista, setVista] = useState({
    trabajo: bloque.trabajo ?? [],
    mediciones: bloque.mediciones ?? {},
  })

  /*
    Y además se guardan de a uno.

    Con la referencia cada guardado ya parte de lo que dejó el anterior, pero
    si salen cuatro a la vez pueden llegar desordenados y gana el que alcance
    a escribir último, que no es el más completo. La cola los manda en fila.
  */
  const cola = useRef<Promise<unknown>>(Promise.resolve())

  function asentar(cambio: Partial<typeof vivo.current>) {
    vivo.current = { ...vivo.current, ...cambio }
    setVista(vivo.current)
    cola.current = cola.current
      .then(() => guardarInformeEquipo(bloque.id, cambio))
      .then(() => alGuardar())
    return cola.current
  }

  const nombre =
    bloque.descripcion ??
    [equipo && (TIPOS_EQUIPO[equipo.tipo] ?? equipo.tipo), equipo?.marca, equipo?.capacidad]
      .filter(Boolean)
      .join(' · ')

  function alternarTarea(tarea: string) {
    const hechas = vivo.current.trabajo.includes(tarea)
      ? vivo.current.trabajo.filter(t => t !== tarea)
      : [...vivo.current.trabajo, tarea]
    void asentar({ trabajo: hechas })
  }

  function fijarMedicion(clave: string, valor: string) {
    const nuevas = { ...vivo.current.mediciones }
    if (valor) nuevas[clave] = valor
    else delete nuevas[clave]
    void asentar({ mediciones: nuevas })
  }

  const medidas = Object.keys(vista.mediciones).length

  // Lo que los números insinúan, y lo que se movió desde la vez pasada.
  const pistas = leerMediciones(familia, vista.mediciones)

  const historial = useConsulta<FilaHistorial[]>(
    () =>
      bloque.equipo_id
        ? historialEquipo(bloque.equipo_id)
        : Promise.resolve({ data: [] as FilaHistorial[], error: null }),
    [bloque.equipo_id],
  )

  const anterior = useMemo(() => {
    const previos = (historial.datos ?? [])
      .filter(f => f.id !== bloque.id && f.informe && f.informe.fecha <= fecha)
      .sort((a, b) => (a.informe!.fecha < b.informe!.fecha ? 1 : -1))
    return previos[0] ?? null
  }, [historial.datos, bloque.id, fecha])

  const cambios = anterior
    ? compararMediciones(mediciones, anterior.mediciones, vista.mediciones).filter(c => c.relevante)
    : []

  return (
    <Tarjeta className="p-3">
      <button onClick={() => setAbierto(v => !v)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{nombre || 'Equipo'}</p>
            <p className="font-mono text-xs text-faint">
              {vista.trabajo.length} de {tareas.length} tareas
              {medidas > 0 && ` · ${medidas} mediciones`}
            </p>
          </div>
          <span className="shrink-0 text-xs text-acero-dk">{abierto ? 'Cerrar' : 'Abrir'}</span>
        </div>
      </button>

      {abierto && (
        <div className="mt-3 space-y-3 border-t border-linea pt-3">
          <ul className="space-y-1.5">
            {tareas.map(t => {
              const hecha = vista.trabajo.includes(t)
              return (
                <li key={t}>
                  <button
                    disabled={bloqueado}
                    onClick={() => alternarTarea(t)}
                    className="flex w-full items-center gap-2.5 text-left text-sm"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded border text-[0.7rem] ${
                        hecha
                          ? 'border-acero bg-acero text-white'
                          : 'border-linea-2 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={hecha ? '' : 'text-mut'}>{t}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <button
            onClick={() => setMidiendo(v => !v)}
            className="text-sm font-medium text-acero-dk"
          >
            {midiendo ? 'Ocultar mediciones' : 'Anotar mediciones (opcional)'}
          </button>

          {midiendo && (
            <div className="grid grid-cols-2 gap-2">
              {mediciones.map(m => (
                <Campo
                  key={m.clave}
                  etiqueta={`${m.etiqueta} (${m.unidad})`}
                  type="number"
                  inputMode="decimal"
                  disabled={bloqueado}
                  defaultValue={vista.mediciones[m.clave] ?? ''}
                  onBlur={e => fijarMedicion(m.clave, e.target.value)}
                />
              ))}
            </div>
          )}

          {pistas.length > 0 && (
            <div className="space-y-2 rounded-lg border border-linea bg-tinte/50 p-3">
              <p className="font-mono text-xs uppercase tracking-wider text-faint">
                Lo que dicen las mediciones
              </p>
              {pistas.map(p => (
                <div key={p.titulo}>
                  <p className="text-sm font-medium">
                    <span
                      className={`mr-1.5 rounded px-1.5 py-0.5 text-[0.7rem] ${
                        NIVELES_HALLAZGO[p.nivel].pastilla
                      }`}
                    >
                      {NIVELES_HALLAZGO[p.nivel].corta}
                    </span>
                    {p.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-mut">{p.porque}</p>
                  <p className="mt-0.5 text-xs text-mut">{p.quehacer}</p>
                </div>
              ))}
              <p className="text-xs text-faint">
                Es orientación, no diagnóstico: confirmar en el equipo antes de proponer nada.
              </p>
            </div>
          )}

          {cambios.length > 0 && anterior?.informe && (
            <div className="rounded-lg border border-linea bg-white p-3">
              <p className="font-mono text-xs uppercase tracking-wider text-faint">
                Cambió desde el {fechaCorta(anterior.informe.fecha)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {cambios.map(c => (
                  <li key={c.clave} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-mut">{c.etiqueta}</span>
                    <span className="shrink-0 font-mono text-xs">
                      {c.antes} → {c.ahora} {c.unidad}
                      <span className={c.variacion > 0 ? 'ml-1.5 text-naranja' : 'ml-1.5 text-acero-dk'}>
                        {c.variacion > 0 ? '+' : ''}
                        {c.variacion}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 border-t border-linea pt-3">
            <p className="font-mono text-xs uppercase tracking-wider text-faint">Diagnóstico</p>
            <Area
              etiqueta="Qué reporta el cliente"
              rows={2}
              disabled={bloqueado}
              defaultValue={bloque.sintoma ?? ''}
              placeholder="Bota agua por dentro desde el jueves"
              onBlur={e =>
                void guardarInformeEquipo(bloque.id, { sintoma: e.target.value || null }).then(alGuardar)
              }
            />
            <Area
              etiqueta="Qué se descartó"
              rows={2}
              disabled={bloqueado}
              defaultValue={bloque.descartado ?? ''}
              placeholder="Drenaje despejado y con pendiente; filtros limpios; carga correcta"
              onBlur={e =>
                void guardarInformeEquipo(bloque.id, { descartado: e.target.value || null }).then(alGuardar)
              }
            />
            <Area
              etiqueta="Causa probable"
              rows={2}
              disabled={bloqueado}
              defaultValue={bloque.causa ?? ''}
              placeholder="Evaporadora fuera de nivel: la bandeja desagua hacia el lado equivocado"
              onBlur={e =>
                void guardarInformeEquipo(bloque.id, { causa: e.target.value || null }).then(alGuardar)
              }
            />
            <Selector
              etiqueta="Qué tan grave"
              opciones={[
                ['', 'Sin clasificar'],
                ...Object.entries(NIVELES_HALLAZGO).map(([k, v]) => [k, v.etiqueta] as [string, string]),
              ]}
              disabled={bloqueado}
              value={bloque.severidad ?? ''}
              onChange={e =>
                void guardarInformeEquipo(bloque.id, {
                  severidad: (e.target.value || null) as NivelHallazgo | null,
                }).then(alGuardar)
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Campo
              etiqueta="Gas"
              disabled={bloqueado}
              defaultValue={bloque.gas_tipo ?? ''}
              onBlur={e => void guardarInformeEquipo(bloque.id, { gas_tipo: e.target.value || null }).then(alGuardar)}
            />
            <Campo
              etiqueta="Recuperado kg"
              type="number"
              inputMode="decimal"
              disabled={bloqueado}
              defaultValue={bloque.gas_recuperado ?? ''}
              onBlur={e =>
                void guardarInformeEquipo(bloque.id, {
                  gas_recuperado: e.target.value ? Number(e.target.value) : null,
                }).then(alGuardar)
              }
            />
            <Campo
              etiqueta="Cargado kg"
              type="number"
              inputMode="decimal"
              disabled={bloqueado}
              defaultValue={bloque.gas_cargado ?? ''}
              onBlur={e =>
                void guardarInformeEquipo(bloque.id, {
                  gas_cargado: e.target.value ? Number(e.target.value) : null,
                }).then(alGuardar)
              }
            />
          </div>

          <Area
            etiqueta="Nota del equipo"
            disabled={bloqueado}
            defaultValue={bloque.nota ?? ''}
            onBlur={e => void guardarInformeEquipo(bloque.id, { nota: e.target.value || null }).then(alGuardar)}
          />

          {!bloqueado && (
            <button
              onClick={async () => {
                await borrarInformeEquipo(bloque.id)
                alGuardar()
              }}
              className="text-xs text-faint"
            >
              Quitar este equipo del informe
            </button>
          )}
        </div>
      )}
    </Tarjeta>
  )
}

/* ── Fotos ──────────────────────────────────────────────────────────────── */

function Fotos({
  informeId,
  fotos,
  bloqueado,
  alCambiar,
}: {
  informeId: string
  fotos: FotoInforme[]
  bloqueado: boolean
  alCambiar: () => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [momento, setMomento] = useState<MomentoFoto>('antes')
  const [subiendo, setSubiendo] = useState(false)
  const [vistas, setVistas] = useState<Record<string, string>>({})

  // Las miniaturas se bajan una vez y se recuerdan: el bucket es privado, así
  // que no hay URL que poner directo en un `img`.
  useEffect(() => {
    let vigente = true
    void (async () => {
      for (const f of fotos) {
        if (vistas[f.id]) continue
        const dataUrl = await leerFoto(f.ruta)
        if (vigente && dataUrl) setVistas(v => ({ ...v, [f.id]: dataUrl }))
      }
    })()
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos])

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return
    setSubiendo(true)
    for (const archivo of Array.from(archivos)) {
      const { ruta } = await subirFoto(informeId, archivo)
      if (ruta) await crearFoto({ informe_id: informeId, ruta, momento, orden: Date.now() % 100000 })
    }
    setSubiendo(false)
    alCambiar()
  }

  return (
    <div className="space-y-2">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {fotos.map(f => (
            <li key={f.id} className="overflow-hidden rounded-lg border border-linea bg-white">
              {vistas[f.id] ? (
                <img src={vistas[f.id]} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="grid h-28 w-full place-items-center text-xs text-faint">
                  cargando…
                </div>
              )}
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="font-mono text-[0.7rem] text-faint">
                  {MOMENTOS_FOTO[f.momento]}
                </span>
                {!bloqueado && (
                  <button
                    onClick={async () => {
                      await borrarFoto(f.ruta)
                      await borrarFotoFila(f.id)
                      alCambiar()
                    }}
                    className="text-[0.7rem] text-faint"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!bloqueado && (
        <>
          <Selector
            etiqueta="Las que vienen son del momento"
            opciones={Object.entries(MOMENTOS_FOTO)}
            value={momento}
            onChange={e => setMomento(e.target.value as MomentoFoto)}
          />
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => void subir(e.target.files)}
          />
          <Boton className="w-full" disabled={subiendo} onClick={() => entrada.current?.click()}>
            {subiendo ? 'Subiendo…' : 'Agregar fotos'}
          </Boton>
          <p className="text-xs text-faint">
            Se achican antes de subir: de 4 MB quedan en unos 300 KB, que es lo que permite subirlas
            con la señal de un local.
          </p>
        </>
      )}
    </div>
  )
}

/* ── Hojas ──────────────────────────────────────────────────────────────── */

function HojaAgregarEquipo({
  abierta,
  informeId,
  equipos,
  usados,
  alCerrar,
  alGuardar,
}: {
  abierta: boolean
  informeId: string
  equipos: Equipo[]
  usados: (string | null)[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [equipoId, setEquipoId] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const libres = equipos.filter(e => !usados.includes(e.id))

  async function guardar() {
    if (!equipoId && !descripcion.trim()) return
    await crearInformeEquipo({
      informe_id: informeId,
      equipo_id: equipoId || null,
      descripcion: equipoId ? null : descripcion.trim(),
      trabajo: [],
      mediciones: {},
      orden: Date.now() % 100000,
    })
    setEquipoId('')
    setDescripcion('')
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja abierta={abierta} titulo="Agregar equipo" alCerrar={alCerrar}>
      <div className="space-y-3">
        <Selector
          etiqueta="De la ficha del cliente"
          opciones={[
            ['', 'Otro, escribirlo abajo'],
            ...libres.map(
              e =>
                [
                  e.id,
                  [TIPOS_EQUIPO[e.tipo] ?? e.tipo, e.marca, e.ubicacion]
                    .filter(Boolean)
                    .join(' · '),
                ] as [string, string],
            ),
          ]}
          value={equipoId}
          onChange={e => setEquipoId(e.target.value)}
        />
        {!equipoId && (
          <Campo
            etiqueta="Qué equipo es"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Split muro 12.000 BTU, sala de venta"
          />
        )}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Agregar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}

function HojaHallazgo({
  abierta,
  informeId,
  alCerrar,
  alGuardar,
}: {
  abierta: boolean
  informeId: string
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [nivel, setNivel] = useState<NivelHallazgo>('atencion')
  const [detalle, setDetalle] = useState('')

  async function guardar() {
    if (!detalle.trim()) return
    await crearHallazgo({ informe_id: informeId, nivel, detalle: detalle.trim() })
    setDetalle('')
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja abierta={abierta} titulo="Agregar hallazgo" alCerrar={alCerrar}>
      <div className="space-y-3">
        <Selector
          etiqueta="Nivel"
          opciones={Object.entries(NIVELES_HALLAZGO).map(
            ([k, v]) => [k, v.etiqueta] as [string, string],
          )}
          value={nivel}
          onChange={e => setNivel(e.target.value as NivelHallazgo)}
        />
        <Area
          etiqueta="Qué se encontró"
          autoFocus
          value={detalle}
          onChange={e => setDetalle(e.target.value)}
          placeholder="El condensador de la cámara está tapado de grasa y el consumo subió a 11 A"
        />
        <p className="text-xs text-faint">
          Esto es lo que después se convierte en el próximo presupuesto.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Agregar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}

function HojaMaterial({
  abierta,
  informeId,
  alCerrar,
  alGuardar,
}: {
  abierta: boolean
  informeId: string
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [insumoId, setInsumoId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('1')

  const catalogo = useConsulta<Insumo[]>(() => consultarCatalogo(), [])
  const consumibles = (catalogo.datos ?? []).filter(x => x.consumible)

  async function guardar() {
    const elegido = consumibles.find(x => x.id === insumoId)
    const texto = elegido?.nombre ?? descripcion.trim()
    if (!texto) return
    await crearMaterial({
      informe_id: informeId,
      insumo_id: elegido?.id ?? null,
      descripcion: texto,
      cantidad: Number(cantidad) || 1,
      unidad: elegido?.unidad ?? 'unidad',
    })
    setDescripcion('')
    setCantidad('1')
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja abierta={abierta} titulo="Agregar material" alCerrar={alCerrar}>
      <div className="space-y-3">
        <Selector
          etiqueta="Del inventario"
          opciones={[
            ['', 'Otro, escribirlo abajo'],
            ...consumibles.map(x => [x.id, x.nombre] as [string, string]),
          ]}
          value={insumoId}
          onChange={e => setInsumoId(e.target.value)}
        />
        {!insumoId && (
          <Campo
            etiqueta="Qué se usó"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        )}
        <Campo
          etiqueta="Cantidad"
          type="number"
          inputMode="decimal"
          value={cantidad}
          onChange={e => setCantidad(e.target.value)}
        />
        <p className="text-xs text-faint">
          Lo que salga del inventario se descuenta al emitir el informe.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Agregar
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}
