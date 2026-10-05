import { useState } from 'react'
import {
  Boton, Campo, Cargando, Etiqueta, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import { IconoAgregar } from '../componentes/iconos'
import {
  consultarClientes, consultarOportunidades, crearOportunidad, guardarOportunidad, useConsulta,
} from '../lib/datos'
import { clp, fechaCorta } from '../lib/formato'
import { ETAPAS, ETAPAS_ABIERTAS, type Cliente, type Etapa, type Oportunidad } from '../lib/tipos'

export function Negocios() {
  const [verCerrados, setVerCerrados] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [monto, setMonto] = useState('')
  const [clienteId, setClienteId] = useState('')

  const { datos, cargando, recargar } = useConsulta<Oportunidad[]>(
    () => consultarOportunidades(!verCerrados),
    [verCerrados],
  )
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])

  const lista = datos ?? []
  const enJuego = lista
    .filter(o => ETAPAS_ABIERTAS.includes(o.etapa))
    .reduce((t, o) => t + (o.monto_neto ?? 0), 0)

  async function agregar() {
    if (!titulo.trim()) return
    await crearOportunidad({
      titulo: titulo.trim(),
      monto_neto: monto ? Number(monto) : null,
      cliente_id: clienteId || null,
      etapa: 'nueva',
    })
    setTitulo('')
    setMonto('')
    setClienteId('')
    setAbierta(false)
    void recargar()
  }

  async function cambiarEtapa(o: Oportunidad, etapa: Etapa) {
    await guardarOportunidad(o.id, { etapa })
    void recargar()
  }

  const porEtapa = (verCerrados ? (Object.keys(ETAPAS) as Etapa[]) : ETAPAS_ABIERTAS)
    .map(etapa => ({ etapa, items: lista.filter(o => o.etapa === etapa) }))
    .filter(g => g.items.length > 0)

  return (
    <Pantalla
      titulo="Negocios"
      bajada={cargando ? undefined : `${clp(enJuego)} en juego`}
      accion={
        <Boton variante="acento" onClick={() => setAbierta(true)} aria-label="Agregar negocio">
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
          <Vacio texto="Sin negocios registrados. Se crean desde un prospecto o con el botón de arriba." />
        ) : (
          porEtapa.map(({ etapa, items }) => (
            <section key={etapa}>
              <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                {ETAPAS[etapa]}
                <span className="font-mono text-xs font-normal text-mut">
                  {clp(items.reduce((t, o) => t + (o.monto_neto ?? 0), 0))}
                </span>
              </h2>
              <ul className="space-y-2">
                {items.map(o => (
                  <li key={o.id}>
                    <Tarjeta className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 text-sm font-medium">{o.titulo}</p>
                        <span className="shrink-0 font-mono text-sm">{clp(o.monto_neto)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                        {o.presupuesto_numero && <Etiqueta tono="mut">{o.presupuesto_numero}</Etiqueta>}
                        <span>actualizado {fechaCorta(o.actualizado_en.slice(0, 10))}</span>
                      </div>
                      <select
                        value={o.etapa}
                        onChange={e => cambiarEtapa(o, e.target.value as Etapa)}
                        className="mt-2 w-full rounded-lg border border-linea-2 bg-white px-2 py-2 text-sm"
                      >
                        {Object.entries(ETAPAS).map(([valor, texto]) => (
                          <option key={valor} value={valor}>
                            {texto}
                          </option>
                        ))}
                      </select>
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Hoja abierta={abierta} titulo="Nuevo negocio" alCerrar={() => setAbierta(false)}>
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
            etiqueta="Cliente"
            opciones={[['', 'Sin cliente todavía'], ...(clientes.datos ?? []).map(c => [c.id, c.nombre] as [string, string])]}
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
          />
          <Boton variante="acento" className="w-full" onClick={agregar}>
            Guardar
          </Boton>
        </div>
      </Hoja>
    </Pantalla>
  )
}
