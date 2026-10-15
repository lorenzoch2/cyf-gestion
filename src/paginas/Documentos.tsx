import { useMemo, useState } from 'react'
import {
  Area, Boton, Campo, Cargando, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  borrarDocumento, consultarDocumentos, consultarTecnicos, crearDocumento, guardarDocumento,
  useConsulta,
} from '../lib/datos'
import { diasHasta, fechaCorta, plural } from '../lib/formato'
import {
  AMBITOS_DOCUMENTO, DOCUMENTOS_SUGERIDOS,
  type AmbitoDocumento, type Documento, type Tecnico,
} from '../lib/tipos'

/*
  Lo que caduca.

  La app no guarda los archivos: viven en la carpeta de la empresa, que es
  donde el contador y el banco los van a buscar. Acá va la fecha y dónde está,
  que es lo único que se olvida.

  El orden es por urgencia y no alfabético: la pregunta es siempre «¿qué se me
  está venciendo?», nunca «¿dónde está la patente?».
*/

type Tramo = 'vencidos' | 'avisando' | 'pronto' | 'tranquilos' | 'sinfecha'

const TRAMOS: Record<Tramo, { titulo: string; tono: string }> = {
  vencidos: { titulo: 'Vencidos', tono: 'text-rojo' },
  avisando: { titulo: 'Hay que renovar ya', tono: 'text-laton-dk' },
  pronto: { titulo: 'Dentro de tres meses', tono: 'text-mut' },
  tranquilos: { titulo: 'Al día', tono: 'text-faint' },
  sinfecha: { titulo: 'Sin fecha anotada', tono: 'text-faint' },
}

const ORDEN: Tramo[] = ['vencidos', 'avisando', 'pronto', 'tranquilos', 'sinfecha']

/** El tramo depende del aviso de cada documento, no de un número fijo. */
function tramoDe(d: Documento): Tramo {
  if (!d.vence_el) return 'sinfecha'
  const dias = diasHasta(d.vence_el) ?? 0
  if (dias < 0) return 'vencidos'
  if (dias <= d.aviso_dias) return 'avisando'
  if (dias <= 92) return 'pronto'
  return 'tranquilos'
}

export function Documentos() {
  const [editando, setEditando] = useState<Documento | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const documentos = useConsulta<Documento[]>(() => consultarDocumentos(), [])
  const tecnicos = useConsulta<Tecnico[]>(() => consultarTecnicos(), [])

  const porTramo = useMemo(() => {
    const grupos = new Map<Tramo, Documento[]>()
    for (const d of documentos.datos ?? []) {
      const t = tramoDe(d)
      const g = grupos.get(t)
      if (g) g.push(d)
      else grupos.set(t, [d])
    }
    return ORDEN.map(t => [t, grupos.get(t) ?? []] as const).filter(([, l]) => l.length > 0)
  }, [documentos.datos])

  const urgentes = (documentos.datos ?? []).filter(d =>
    ['vencidos', 'avisando'].includes(tramoDe(d)),
  )

  const deQuien = (d: Documento) =>
    d.tecnico_id
      ? (tecnicos.datos?.find(t => t.id === d.tecnico_id)?.nombre.split(' ')[0] ?? 'persona')
      : AMBITOS_DOCUMENTO[d.ambito].replace('De la ', '').replace('De una ', '')

  return (
    <Pantalla
      titulo="Documentos"
      bajada={
        documentos.cargando
          ? 'Cargando…'
          : plural((documentos.datos ?? []).length, 'documento', 'documentos') +
            (urgentes.length ? ` · ${urgentes.length} por renovar` : '')
      }
      volver
      accion={
        <Boton variante="acento" className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Agregar
        </Boton>
      }
    >
      {documentos.cargando ? (
        <Cargando />
      ) : (documentos.datos ?? []).length === 0 ? (
        <Vacio texto="Todavía no hay documentos anotados. Van la patente, los seguros, el permiso de circulación y las certificaciones, con su fecha de vencimiento." />
      ) : (
        <div className="space-y-5">
          {porTramo.map(([tramo, lista]) => (
            <section key={tramo}>
              <h2 className={`mb-2 font-mono text-xs uppercase tracking-wider ${TRAMOS[tramo].tono}`}>
                {TRAMOS[tramo].titulo} · {lista.length}
              </h2>
              <ul className="space-y-2">
                {lista.map(d => {
                  const dias = d.vence_el ? (diasHasta(d.vence_el) ?? 0) : null
                  return (
                    <li key={d.id}>
                      <button onClick={() => setEditando(d)} className="block w-full text-left">
                        <Tarjeta className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{d.nombre}</p>
                              <p className="truncate text-sm text-mut">{deQuien(d)}</p>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-xs ${
                                dias !== null && dias < 0 ? 'text-rojo' : 'text-faint'
                              }`}
                            >
                              {d.vence_el ? fechaCorta(d.vence_el) : '—'}
                            </span>
                          </div>
                          {dias !== null && (
                            <p className="mt-1.5 font-mono text-xs text-faint">
                              {dias < 0
                                ? `vencido hace ${-dias} d`
                                : dias === 0
                                  ? 'vence hoy'
                                  : `quedan ${dias} d`}
                              {d.ubicacion && ` · ${d.ubicacion}`}
                            </p>
                          )}
                        </Tarjeta>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Ficha
        documento={editando}
        abierta={nuevo || editando !== null}
        tecnicos={tecnicos.datos ?? []}
        alCerrar={() => {
          setNuevo(false)
          setEditando(null)
        }}
        alGuardar={() => void documentos.recargar()}
      />
    </Pantalla>
  )
}

function Ficha({
  documento,
  abierta,
  tecnicos,
  alCerrar,
  alGuardar,
}: {
  documento: Documento | null
  abierta: boolean
  tecnicos: Tecnico[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [clave, setClave] = useState('nuevo')
  const [campos, setCampos] = useState({
    nombre: '', ambito: 'empresa', tecnicoId: '', emitido: '', vence: '',
    aviso: '30', ubicacion: '', nota: '',
  })

  if (clave !== (documento?.id ?? 'nuevo')) {
    setClave(documento?.id ?? 'nuevo')
    setCampos({
      nombre: documento?.nombre ?? '',
      ambito: documento?.ambito ?? 'empresa',
      tecnicoId: documento?.tecnico_id ?? '',
      emitido: documento?.emitido_el ?? '',
      vence: documento?.vence_el ?? '',
      aviso: String(documento?.aviso_dias ?? 30),
      ubicacion: documento?.ubicacion ?? '',
      nota: documento?.nota ?? '',
    })
  }

  function cambiar(campo: keyof typeof campos) {
    return (e: { target: { value: string } }) =>
      setCampos(c => ({ ...c, [campo]: e.target.value }))
  }

  /** Elegir una sugerencia rellena nombre, ámbito, aviso y dónde vive. */
  function sugerir(nombre: string) {
    const s = DOCUMENTOS_SUGERIDOS.find(x => x.nombre === nombre)
    if (!s) return
    setCampos(c => ({
      ...c,
      nombre: s.nombre,
      ambito: s.ambito,
      aviso: String(s.aviso),
      ubicacion: s.donde ?? c.ubicacion,
    }))
  }

  async function guardar() {
    if (!campos.nombre.trim()) return
    const datos: Partial<Documento> = {
      nombre: campos.nombre.trim(),
      ambito: campos.ambito as AmbitoDocumento,
      tecnico_id: campos.ambito === 'persona' ? campos.tecnicoId || null : null,
      emitido_el: campos.emitido || null,
      vence_el: campos.vence || null,
      aviso_dias: Number(campos.aviso) || 30,
      ubicacion: campos.ubicacion.trim() || null,
      nota: campos.nota.trim() || null,
    }
    if (documento) await guardarDocumento(documento.id, datos)
    else await crearDocumento(datos)
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja
      abierta={abierta}
      titulo={documento ? 'Editar documento' : 'Agregar documento'}
      alCerrar={alCerrar}
    >
      <div className="space-y-3">
        {!documento && (
          <Selector
            etiqueta="De la lista"
            opciones={[
              ['', 'Escribirlo abajo'],
              ...DOCUMENTOS_SUGERIDOS.map(s => [s.nombre, s.nombre] as [string, string]),
            ]}
            value=""
            onChange={e => sugerir(e.target.value)}
          />
        )}

        <Campo etiqueta="Nombre" value={campos.nombre} onChange={cambiar('nombre')} />
        <Selector
          etiqueta="De quién es"
          opciones={Object.entries(AMBITOS_DOCUMENTO)}
          value={campos.ambito}
          onChange={cambiar('ambito')}
        />
        {campos.ambito === 'persona' && (
          <Selector
            etiqueta="Quién"
            opciones={[['', 'Sin asignar'], ...tecnicos.map(t => [t.id, t.nombre] as [string, string])]}
            value={campos.tecnicoId}
            onChange={cambiar('tecnicoId')}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Emitido" type="date" value={campos.emitido} onChange={cambiar('emitido')} />
          <Campo etiqueta="Vence" type="date" value={campos.vence} onChange={cambiar('vence')} />
        </div>
        <Campo
          etiqueta="Avisar con cuántos días"
          type="number"
          inputMode="numeric"
          value={campos.aviso}
          onChange={cambiar('aviso')}
          pista="Lo que toma el trámite. Una patente municipal pide holgura; un certificado de vigencia llega el mismo día."
        />
        <Campo
          etiqueta="Dónde está el archivo"
          value={campos.ubicacion}
          onChange={cambiar('ubicacion')}
          placeholder="03 Municipal"
        />
        <Area etiqueta="Nota" value={campos.nota} onChange={cambiar('nota')} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Guardar
          </Boton>
        </div>

        {documento && (
          <div className="grid grid-cols-2 gap-2">
            <Boton
              onClick={async () => {
                await guardarDocumento(documento.id, { archivado: true })
                alGuardar()
                alCerrar()
              }}
            >
              Archivar
            </Boton>
            <Boton
              variante="peligro"
              onClick={async () => {
                await borrarDocumento(documento.id)
                alGuardar()
                alCerrar()
              }}
            >
              Borrar
            </Boton>
          </div>
        )}
      </div>
    </Hoja>
  )
}
