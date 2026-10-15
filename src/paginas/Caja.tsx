import { useMemo, useState } from 'react'
import {
  Area, Boton, Campo, Cargando, Dato, Hoja, Pantalla, Selector, Tarjeta, Vacio,
} from '../componentes/ui'
import {
  borrarMovimiento, consultarClientes, consultarMovimientos, consultarPendientes,
  consultarProveedores, crearMovimiento, guardarMovimiento, useConsulta,
} from '../lib/datos'
import {
  clp, conIva, fechaCorta, hoyIso, IVA, mesActual, mesLargo, mesVecino, plural, rangoMes,
} from '../lib/formato'
import {
  CATEGORIAS_EGRESO, CATEGORIAS_INGRESO, DOCUMENTOS_CON_IVA, TIPOS_DOCUMENTO,
  type Cliente, type Movimiento, type Proveedor, type TipoDocumento, type TipoMovimiento,
} from '../lib/tipos'

/*
  La caja.

  Alcance decidido con los socios: la app registra y entrega las cifras del mes
  ya ordenadas; el libro de contabilidad y el F29 siguen siendo el registro
  formal. Esto los alimenta, no los reemplaza — y la pantalla lo dice, porque
  una app que parece el libro termina siendo el libro sin que nadie lo decida.

  El IVA del mes se calcula sobre lo emitido y recibido en el mes, no sobre lo
  cobrado: así es como se declara. El remanente arrastrado de meses anteriores
  vive en el libro, que es donde está la cadena completa.
*/
export function Caja() {
  const [mes, setMes] = useState(mesActual())
  const [tipo, setTipo] = useState<'todos' | TipoMovimiento>('todos')
  const [editando, setEditando] = useState<Movimiento | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const [desde, hasta] = rangoMes(mes)
  const movimientos = useConsulta<Movimiento[]>(
    () => consultarMovimientos(desde, hasta),
    [desde, hasta],
  )
  const pendientes = useConsulta<Movimiento[]>(() => consultarPendientes(), [])
  const clientes = useConsulta<Cliente[]>(() => consultarClientes(), [])
  const proveedores = useConsulta<Proveedor[]>(() => consultarProveedores(), [])

  const resumen = useMemo(() => {
    const filas = movimientos.datos ?? []
    const suma = (t: TipoMovimiento, campo: 'neto' | 'iva' | 'total') =>
      filas.filter(f => f.tipo === t).reduce((s, f) => s + (f[campo] ?? 0), 0)

    // Sólo factura y boleta mueven IVA: una boleta de honorarios o una compra
    // sin documento no dan crédito fiscal, por más que hayan salido de la caja.
    const conIvaDe = (t: TipoMovimiento) =>
      filas
        .filter(f => f.tipo === t && DOCUMENTOS_CON_IVA.includes(f.documento))
        .reduce((s, f) => s + (f.iva ?? 0), 0)

    const debito = conIvaDe('ingreso')
    const credito = conIvaDe('egreso')
    const cobrado = filas
      .filter(f => f.tipo === 'ingreso' && f.estado === 'pagado')
      .reduce((s, f) => s + f.total, 0)
    const pagado = filas
      .filter(f => f.tipo === 'egreso' && f.estado === 'pagado')
      .reduce((s, f) => s + f.total, 0)

    return {
      ingresoNeto: suma('ingreso', 'neto'),
      egresoNeto: suma('egreso', 'neto'),
      ingresoTotal: suma('ingreso', 'total'),
      egresoTotal: suma('egreso', 'total'),
      debito,
      credito,
      iva: debito - credito,
      cobrado,
      pagado,
      caja: cobrado - pagado,
      margen: suma('ingreso', 'neto') - suma('egreso', 'neto'),
    }
  }, [movimientos.datos])

  const porCobrar = (pendientes.datos ?? []).filter(m => m.tipo === 'ingreso')
  const porPagar = (pendientes.datos ?? []).filter(m => m.tipo === 'egreso')

  const visibles = (movimientos.datos ?? []).filter(m => tipo === 'todos' || m.tipo === tipo)

  const nombreDe = (m: Movimiento) =>
    m.tipo === 'ingreso'
      ? (clientes.datos?.find(c => c.id === m.cliente_id)?.nombre ?? null)
      : (proveedores.datos?.find(p => p.id === m.proveedor_id)?.nombre ?? null)

  function recargar() {
    void movimientos.recargar()
    void pendientes.recargar()
  }

  return (
    <Pantalla
      titulo="Caja"
      bajada={mesLargo(mes)}
      volver
      accion={
        <Boton variante="acento" className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Agregar
        </Boton>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Boton className="min-h-9 px-3 text-sm" onClick={() => setMes(m => mesVecino(m, -1))}>
            ← mes anterior
          </Boton>
          <Boton
            className="min-h-9 px-3 text-sm"
            onClick={() => setMes(m => mesVecino(m, 1))}
            disabled={mes >= mesActual()}
          >
            mes siguiente →
          </Boton>
        </div>

        {movimientos.cargando ? (
          <Cargando />
        ) : (
          <>
            <Tarjeta className="space-y-1 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-faint">
                El mes, en neto
              </p>
              <Dato etiqueta="Ingresos">{clp(resumen.ingresoNeto)}</Dato>
              <Dato etiqueta="Egresos">{clp(resumen.egresoNeto)}</Dato>
              <Dato etiqueta="Diferencia">
                <span className={resumen.margen < 0 ? 'font-semibold text-rojo' : 'font-semibold'}>
                  {clp(resumen.margen)}
                </span>
              </Dato>
            </Tarjeta>

            <Tarjeta className="space-y-1 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-faint">
                Para el F29
              </p>
              <Dato etiqueta="IVA débito, de lo emitido">{clp(resumen.debito)}</Dato>
              <Dato etiqueta="IVA crédito, de lo recibido">{clp(resumen.credito)}</Dato>
              <Dato etiqueta={resumen.iva >= 0 ? 'IVA a pagar' : 'Remanente del mes'}>
                <span className="font-semibold">{clp(Math.abs(resumen.iva))}</span>
              </Dato>
              <p className="pt-1 text-xs text-faint">
                Calculado sobre lo emitido y recibido en el mes, que es como se declara. No incluye
                el remanente que viene arrastrado: esa cadena está en el libro de contabilidad, y el
                F29 se declara con la propuesta del SII.
              </p>
            </Tarjeta>

            <Tarjeta className="space-y-1 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-faint">
                Movimiento de caja
              </p>
              <Dato etiqueta="Cobrado">{clp(resumen.cobrado)}</Dato>
              <Dato etiqueta="Pagado">{clp(resumen.pagado)}</Dato>
              <Dato etiqueta="Quedó en caja">
                <span className={resumen.caja < 0 ? 'font-semibold text-rojo' : 'font-semibold'}>
                  {clp(resumen.caja)}
                </span>
              </Dato>
            </Tarjeta>
          </>
        )}

        {(porCobrar.length > 0 || porPagar.length > 0) && (
          <section>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
              Pendiente, de todos los meses
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Tarjeta className="p-3">
                <p className="text-sm text-mut">Por cobrar</p>
                <p className="font-mono text-lg font-semibold text-laton-dk">
                  {clp(porCobrar.reduce((s, m) => s + m.total, 0))}
                </p>
                <p className="font-mono text-xs text-faint">
                  {plural(porCobrar.length, 'documento', 'documentos')}
                </p>
              </Tarjeta>
              <Tarjeta className="p-3">
                <p className="text-sm text-mut">Por pagar</p>
                <p className="font-mono text-lg font-semibold">
                  {clp(porPagar.reduce((s, m) => s + m.total, 0))}
                </p>
                <p className="font-mono text-xs text-faint">
                  {plural(porPagar.length, 'documento', 'documentos')}
                </p>
              </Tarjeta>
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex gap-2">
            {(
              [
                ['todos', 'Todo'],
                ['ingreso', 'Ingresos'],
                ['egreso', 'Egresos'],
              ] as [typeof tipo, string][]
            ).map(([valor, texto]) => (
              <button
                key={valor}
                onClick={() => setTipo(valor)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  tipo === valor
                    ? 'border-grafito bg-grafito text-papel'
                    : 'border-linea-2 bg-white text-mut'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <Vacio texto="Sin movimientos este mes. Se anota cada factura y boleta, emitida o recibida, el mismo día." />
          ) : (
            <ul className="space-y-2">
              {visibles.map(m => (
                <li key={m.id}>
                  <button onClick={() => setEditando(m)} className="block w-full text-left">
                    <Tarjeta
                      className={`border-l-4 p-3 ${
                        m.tipo === 'ingreso' ? 'border-l-verde' : 'border-l-linea-2'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.descripcion}</p>
                          <p className="truncate text-sm text-mut">
                            {[nombreDe(m), m.categoria].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-medium">
                            {m.tipo === 'egreso' && '-'}
                            {clp(m.total)}
                          </p>
                          <p className="font-mono text-xs text-faint">{fechaCorta(m.fecha)}</p>
                        </div>
                      </div>
                      <p className="mt-1.5 flex items-center gap-2 font-mono text-xs text-faint">
                        <span>{TIPOS_DOCUMENTO[m.documento]}</span>
                        {m.numero && <span>N° {m.numero}</span>}
                        {m.estado === 'pendiente' && (
                          <span className="text-laton-dk">
                            {m.tipo === 'ingreso' ? 'por cobrar' : 'por pagar'}
                          </span>
                        )}
                      </p>
                    </Tarjeta>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <FichaMovimiento
        movimiento={editando}
        abierta={nuevo || editando !== null}
        clientes={clientes.datos ?? []}
        proveedores={proveedores.datos ?? []}
        alCerrar={() => {
          setNuevo(false)
          setEditando(null)
        }}
        alGuardar={recargar}
      />
    </Pantalla>
  )
}

/* ── Alta y edición ─────────────────────────────────────────────────────── */

function FichaMovimiento({
  movimiento,
  abierta,
  clientes,
  proveedores,
  alCerrar,
  alGuardar,
}: {
  movimiento: Movimiento | null
  abierta: boolean
  clientes: Cliente[]
  proveedores: Proveedor[]
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [clave, setClave] = useState('nuevo')
  const [campos, setCampos] = useState({
    tipo: 'ingreso' as TipoMovimiento,
    fecha: hoyIso(),
    descripcion: '',
    categoria: '',
    quien: '',
    documento: 'factura' as TipoDocumento,
    numero: '',
    neto: '',
    retencion: '',
    estado: 'pendiente',
    vence: '',
    nota: '',
  })

  if (clave !== (movimiento?.id ?? 'nuevo')) {
    setClave(movimiento?.id ?? 'nuevo')
    setCampos({
      tipo: movimiento?.tipo ?? 'ingreso',
      fecha: movimiento?.fecha ?? hoyIso(),
      descripcion: movimiento?.descripcion ?? '',
      categoria: movimiento?.categoria ?? '',
      quien: movimiento?.cliente_id ?? movimiento?.proveedor_id ?? '',
      documento: movimiento?.documento ?? 'factura',
      numero: movimiento?.numero ?? '',
      neto: movimiento ? String(movimiento.neto) : '',
      retencion: movimiento?.retencion ? String(movimiento.retencion) : '',
      estado: movimiento?.estado ?? 'pendiente',
      vence: movimiento?.vence_el ?? '',
      nota: movimiento?.nota ?? '',
    })
  }

  function cambiar<K extends keyof typeof campos>(campo: K) {
    return (e: { target: { value: string } }) =>
      setCampos(c => ({ ...c, [campo]: e.target.value }))
  }

  // El IVA se calcula sobre el neto y sólo si el documento lo lleva.
  const neto = Math.round(Number(campos.neto) || 0)
  const llevaIva = DOCUMENTOS_CON_IVA.includes(campos.documento)
  const iva = llevaIva ? conIva(neto) - neto : 0
  const retencion = Math.round(Number(campos.retencion) || 0)
  const total = neto + iva - retencion

  async function guardar() {
    if (!campos.descripcion.trim() || neto === 0) return
    const datos: Partial<Movimiento> = {
      tipo: campos.tipo,
      fecha: campos.fecha,
      descripcion: campos.descripcion.trim(),
      categoria: campos.categoria || null,
      cliente_id: campos.tipo === 'ingreso' ? campos.quien || null : null,
      proveedor_id: campos.tipo === 'egreso' ? campos.quien || null : null,
      documento: campos.documento,
      numero: campos.numero.trim() || null,
      neto,
      iva,
      retencion,
      total,
      estado: campos.estado as Movimiento['estado'],
      vence_el: campos.vence || null,
      pagado_el: campos.estado === 'pagado' ? (movimiento?.pagado_el ?? hoyIso()) : null,
      nota: campos.nota.trim() || null,
    }
    if (movimiento) await guardarMovimiento(movimiento.id, datos)
    else await crearMovimiento(datos)
    alGuardar()
    alCerrar()
  }

  const categorias = campos.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO
  const contrapartes = campos.tipo === 'ingreso' ? clientes : proveedores

  return (
    <Hoja
      abierta={abierta}
      titulo={movimiento ? 'Editar movimiento' : 'Agregar movimiento'}
      alCerrar={alCerrar}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['ingreso', 'Entró'],
              ['egreso', 'Salió'],
            ] as [TipoMovimiento, string][]
          ).map(([valor, texto]) => (
            <Boton
              key={valor}
              variante={campos.tipo === valor ? 'acento' : 'linea'}
              onClick={() => setCampos(c => ({ ...c, tipo: valor, quien: '', categoria: '' }))}
            >
              {texto}
            </Boton>
          ))}
        </div>

        <Campo
          etiqueta="Qué fue"
          autoFocus
          value={campos.descripcion}
          onChange={cambiar('descripcion')}
          placeholder="Mantención de cuatro splits"
        />
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Fecha" type="date" value={campos.fecha} onChange={cambiar('fecha')} />
          <Selector
            etiqueta="Categoría"
            opciones={[['', 'Sin categoría'], ...categorias.map(c => [c, c] as [string, string])]}
            value={campos.categoria}
            onChange={cambiar('categoria')}
          />
        </div>

        <Selector
          etiqueta={campos.tipo === 'ingreso' ? 'Cliente' : 'Proveedor'}
          opciones={[
            ['', 'Sin asignar'],
            ...contrapartes.map(c => [c.id, c.nombre] as [string, string]),
          ]}
          value={campos.quien}
          onChange={cambiar('quien')}
        />

        <div className="grid grid-cols-2 gap-2">
          <Selector
            etiqueta="Documento"
            opciones={Object.entries(TIPOS_DOCUMENTO)}
            value={campos.documento}
            onChange={cambiar('documento')}
          />
          <Campo etiqueta="N°" value={campos.numero} onChange={cambiar('numero')} />
        </div>

        <Campo
          etiqueta="Monto neto"
          type="number"
          inputMode="numeric"
          value={campos.neto}
          onChange={cambiar('neto')}
          pista="Sin IVA. El tarifario y los presupuestos también van en netos."
        />
        {campos.documento === 'honorarios' && (
          <Campo
            etiqueta="Retención"
            type="number"
            inputMode="numeric"
            value={campos.retencion}
            onChange={cambiar('retencion')}
            pista="Se anota a mano: la tasa la fija la ley y sube cada año."
          />
        )}

        <Tarjeta className="space-y-1 p-3">
          <Dato etiqueta="Neto">{clp(neto)}</Dato>
          <Dato etiqueta={llevaIva ? `IVA ${Math.round(IVA * 100)}%` : 'Sin IVA'}>{clp(iva)}</Dato>
          {retencion > 0 && <Dato etiqueta="Retención">−{clp(retencion)}</Dato>}
          <Dato etiqueta="Total">
            <span className="font-semibold">{clp(total)}</span>
          </Dato>
        </Tarjeta>

        <div className="grid grid-cols-2 gap-2">
          <Selector
            etiqueta="Estado"
            opciones={[
              ['pendiente', campos.tipo === 'ingreso' ? 'Por cobrar' : 'Por pagar'],
              ['pagado', campos.tipo === 'ingreso' ? 'Cobrado' : 'Pagado'],
            ]}
            value={campos.estado}
            onChange={cambiar('estado')}
          />
          {campos.estado === 'pendiente' && (
            <Campo etiqueta="Vence" type="date" value={campos.vence} onChange={cambiar('vence')} />
          )}
        </div>

        <Area etiqueta="Nota" value={campos.nota} onChange={cambiar('nota')} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Guardar
          </Boton>
        </div>

        {movimiento && (
          <Boton
            variante="peligro"
            className="w-full"
            onClick={async () => {
              await borrarMovimiento(movimiento.id)
              alGuardar()
              alCerrar()
            }}
          >
            Borrar movimiento
          </Boton>
        )}
      </div>
    </Hoja>
  )
}
