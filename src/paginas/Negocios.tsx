import { useState } from 'react'
import {
  Boton, Campo, Cargando, Confirmar, Etiqueta, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import {
  borrarOportunidad, consultarClientes, consultarOportunidades, crearOportunidad,
  guardarOportunidad, useConsulta,
} from '../lib/datos'
import { clp, fechaCorta } from '../lib/formato'
import { ETAPAS, ETAPAS_ABIERTAS, type Cliente, type Etapa, type Oportunidad } from '../lib/tipos'

export function Negocios() {
  const [verCerrados, setVerCerrados] = useState(false)
  const [hoja, setHoja] = useState<'nuevo' | 'editar' | null>(null)
  const [enEdicion, setEnEdicion] = useState<Oportunidad | null>(null)
  const [cerrando, setCerrando] = useState<{ o: Oportunidad; etapa: Etapa } | null>(null)
  const [borrando, setBorrando] = useState<Oportunidad | null>(null)

  const [titulo, setTitulo] = useState('')
  const [monto, setMonto] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('nueva')

  const { datos, cargando, recargar } = useConsulta<Oportunidad[]>(
    () => consultarOportunidades(!verCerrados),
    [verCerrados],
  )
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])

  const lista = datos ?? []
  const enJuego = lista
    .filter(o => ETAPAS_ABIERTAS.includes(o.etapa))
    .reduce((t, o) => t + (o.monto_neto ?? 0), 0)

  function abrirNuevo() {
    setTitulo('')
    setMonto('')
    setClienteId('')
    setEtapa('nueva')
    setEnEdicion(null)
    setHoja('nuevo')
  }

  function abrirEdicion(o: Oportunidad) {
    setEnEdicion(o)
    setTitulo(o.titulo)
    setMonto(o.monto_neto ? String(o.monto_neto) : '')
    setClienteId(o.cliente_id ?? '')
    setEtapa(o.etapa)
    setHoja('editar')
  }

  async function guardar() {
    if (!titulo.trim()) return
    const cambios = {
      titulo: titulo.trim(),
      monto_neto: monto ? Number(monto) : null,
      cliente_id: clienteId || null,
      etapa,
    }
    // Cerrar un negocio se confirma aparte: es el dato que después se mira.
    if (enEdicion && (etapa === 'ganada' || etapa === 'perdida') && enEdicion.etapa !== etapa) {
      setCerrando({ o: enEdicion, etapa })
      return
    }
    if (enEdicion) await guardarOportunidad(enEdicion.id, cambios)
    else await crearOportunidad(cambios)
    setHoja(null)
    setEnEdicion(null)
    void recargar()
  }

  const porEtapa = (verCerrados ? (Object.keys(ETAPAS) as Etapa[]) : ETAPAS_ABIERTAS)
    .map(e => ({ etapa: e, items: lista.filter(o => o.etapa === e) }))
    .filter(g => g.items.length > 0)

  return (
    <Pantalla
      titulo="Negocios"
      bajada={cargando ? undefined : `${clp(enJuego)} en juego`}
      accion={
        <Boton variante="acento" onClick={abrirNuevo} aria-label="Agregar negocio">
          <IconoAgregar />
        </Boton>
      }
    >
      <div className="flex gap-2">
        <Boton variante={verCerrados ? 'linea' : 'acento'} onClick={() => setVerCerrados(false)}>
          Abiertos
        </Boton>
        <Boton variante={verCerrados ? 'acento' : 'linea'} onClick={() => setVerCerrados(true)}>
          Todos
        </Boton>
      </div>

      <div className="mt-4 space-y-6">
        {cargando ? (
          <Cargando />
        ) : porEtapa.length === 0 ? (
          <Vacio texto="Sin negocios registrados. Se crean desde un local o con el botón de arriba." />
        ) : (
          porEtapa.map(({ etapa: e, items }) => (
            <section key={e}>
              <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                {ETAPAS[e]}
                <span className="font-mono text-xs font-normal text-mut">
                  {clp(items.reduce((t, o) => t + (o.monto_neto ?? 0), 0))}
                </span>
              </h2>
              <ul className="space-y-2">
                {items.map(o => (
                  <li key={o.id}>
                    <button onClick={() => abrirEdicion(o)} className="w-full text-left">
                      <Tarjeta className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 text-sm font-medium">{o.titulo}</p>
                          <span className="shrink-0 font-mono text-sm">{clp(o.monto_neto)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                          {o.presupuesto_numero && <Etiqueta tono="mut">{o.presupuesto_numero}</Etiqueta>}
                          <span>actualizado {fechaCorta(o.actualizado_en.slice(0, 10))}</span>
                        </div>
                      </Tarjeta>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Hoja
        abierta={hoja !== null}
        titulo={hoja === 'editar' ? 'Editar negocio' : 'Nuevo negocio'}
        alCerrar={() => setHoja(null)}
      >
        <div className="space-y-3">
          <Campo
            etiqueta="De qué se trata"
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Mantención trimestral — Minimarket Las Flores"
          />
          <Campo
            etiqueta="Monto neto estimado"
            type="number"
            inputMode="numeric"
            value={monto}
            onChange={e => setMonto(e.target.value)}
          />
          <Selector
            etiqueta="Etapa"
            opciones={Object.entries(ETAPAS)}
            value={etapa}
            onChange={e => setEtapa(e.target.value as Etapa)}
          />
          <Selector
            etiqueta="Cliente"
            opciones={[['', 'Sin cliente todavía'], ...(clientes.datos ?? []).map(c => [c.id, c.nombre] as [string, string])]}
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Boton onClick={() => setHoja(null)}>Cancelar</Boton>
            <Boton variante="acento" onClick={guardar}>Guardar</Boton>
          </div>
          <p className="text-xs text-faint">Nada cambia hasta que toques «Guardar».</p>

          {/* Se podía crear un negocio y quedar atrapado con él en la lista. */}
          {hoja === 'editar' && enEdicion && (
            <Boton
              variante="peligro"
              className="w-full"
              onClick={() => {
                const o = enEdicion
                setHoja(null)
                setBorrando(o)
              }}
            >
              Borrar este negocio
            </Boton>
          )}
        </div>
      </Hoja>

      <Confirmar
        abierta={cerrando !== null}
        titulo={cerrando?.etapa === 'ganada' ? '¿Negocio ganado?' : '¿Negocio perdido?'}
        detalle="Sale de la lista de abiertos y deja de sumar al monto en juego."
        textoAceptar="Confirmar"
        alCerrar={() => setCerrando(null)}
        alAceptar={async () => {
          if (!cerrando) return
          await guardarOportunidad(cerrando.o.id, {
            titulo: titulo.trim(),
            monto_neto: monto ? Number(monto) : null,
            cliente_id: clienteId || null,
            etapa: cerrando.etapa,
          })
          setHoja(null)
          setEnEdicion(null)
          void recargar()
        }}
      />
      <Confirmar
        abierta={borrando !== null}
        titulo="Borrar el negocio"
        detalle={`«${borrando?.titulo ?? ''}» desaparece de la lista. No se puede deshacer.`}
        textoAceptar="Borrar"
        peligro
        alAceptar={() => {
          if (borrando) void borrarOportunidad(borrando.id).then(() => void recargar())
        }}
        alCerrar={() => setBorrando(null)}
      />
    </Pantalla>
  )
}
