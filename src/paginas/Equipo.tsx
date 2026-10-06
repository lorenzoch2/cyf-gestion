import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Campo, Cargando, Hoja, Pantalla, Tarjeta, Vacio } from '../componentes/ui'
import {
  consultarCatalogo, consultarExistencias, consultarTecnicos, crearTecnico, guardarTecnico,
  useConsulta,
} from '../lib/datos'
import { crearCuenta } from '../lib/cuentas'
import type { Existencia, Insumo, Tecnico } from '../lib/tipos'

/*
  Las personas de la empresa.

  Un técnico no es una cuenta de acceso: Francisco tiene su caja de
  herramientas aunque nunca entre a la app. Si algún día tiene cuenta, se
  enlaza; mientras tanto esto es una lista de personas y de lo que le toca a
  cada una.
*/
export function Equipo() {
  const [editando, setEditando] = useState<Tecnico | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [creandoCuenta, setCreandoCuenta] = useState(false)

  const tecnicos = useConsulta<Tecnico[]>(() => consultarTecnicos(), [])
  const catalogo = useConsulta<Insumo[]>(() => consultarCatalogo(), [])
  const existencias = useConsulta<Existencia[]>(() => consultarExistencias(), [])

  // La caja personal: solo los ítems de ámbito «cada técnico».
  const personales = useMemo(
    () => (catalogo.datos ?? []).filter(i => i.ambito === 'T'),
    [catalogo.datos],
  )

  function dotacion(tecnicoId: string) {
    const suyas = (existencias.datos ?? []).filter(
      e => e.tecnico_id === tecnicoId && e.estado === 'tiene',
    )
    const ids = new Set(suyas.map(e => e.insumo_id))
    return personales.filter(i => ids.has(i.id)).length
  }

  return (
    <Pantalla
      titulo="Equipo"
      bajada="Las personas y lo que le toca a cada una"
      volver
      accion={
        <Boton className="min-h-9 px-3 text-sm" onClick={() => setNuevo(true)}>
          Agregar
        </Boton>
      }
    >
      {tecnicos.cargando ? (
        <Cargando />
      ) : (tecnicos.datos ?? []).length === 0 ? (
        <Vacio texto="Todavía no hay nadie en la lista." />
      ) : (
        <ul className="space-y-2">
          {(tecnicos.datos ?? []).map(t => {
            const tiene = dotacion(t.id)
            return (
              <li key={t.id}>
                <Tarjeta className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {t.nombre}
                        {!t.activo && <span className="ml-2 text-xs text-faint">inactivo</span>}
                      </p>
                      <p className="truncate text-sm text-mut">{t.rol ?? 'Sin cargo'}</p>
                    </div>
                    <button
                      onClick={() => setEditando(t)}
                      className="shrink-0 text-sm font-medium text-acero-dk"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-faint">
                      dotación: {tiene} de {personales.length}
                    </span>
                    <Link
                      to="/inventario"
                      className="text-xs font-medium text-acero-dk"
                    >
                      Ver su caja
                    </Link>
                  </div>
                  {/* La barra dice de un vistazo quién anda a medias. */}
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-linea">
                    <div
                      className="h-full rounded-full bg-laton"
                      style={{
                        width: personales.length
                          ? `${Math.round((100 * tiene) / personales.length)}%`
                          : '0%',
                      }}
                    />
                  </div>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      <section className="mt-8">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
          Cuentas de acceso
        </h2>
        <Tarjeta className="p-3">
          <p className="text-sm text-mut">
            Una cuenta deja entrar a la app desde otro teléfono. Es distinto de agregar a una
            persona a la lista de arriba: se puede estar en el equipo sin tener cuenta.
          </p>
          <Boton className="mt-3 w-full" onClick={() => setCreandoCuenta(true)}>
            Crear cuenta
          </Boton>
        </Tarjeta>
      </section>

      <FichaTecnico
        tecnico={editando}
        abierta={nuevo || editando !== null}
        alCerrar={() => {
          setNuevo(false)
          setEditando(null)
        }}
        alGuardar={() => void tecnicos.recargar()}
      />

      <HojaCuenta abierta={creandoCuenta} alCerrar={() => setCreandoCuenta(false)} />
    </Pantalla>
  )
}

/* ── Crear una cuenta de acceso ─────────────────────────────────────────── */

function HojaCuenta({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [estado, setEstado] = useState<{ error?: string; listo?: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function crear() {
    setEnviando(true)
    setEstado(null)
    const r = await crearCuenta(email.trim(), clave, nombre.trim() || undefined)
    setEnviando(false)
    if (r.ok) {
      setEstado({ listo: true })
      setEmail('')
      setClave('')
      setNombre('')
    } else {
      setEstado({ error: r.error })
    }
  }

  return (
    <Hoja abierta={abierta} titulo="Crear cuenta" alCerrar={alCerrar}>
      <div className="space-y-3">
        <Campo etiqueta="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="off"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Clave"
          type="password"
          autoComplete="new-password"
          value={clave}
          onChange={e => setClave(e.target.value)}
          pista="Diez caracteres o más. Quien reciba la cuenta puede cambiarla después."
        />

        {estado?.error && <p className="text-sm text-rojo">{estado.error}</p>}
        {estado?.listo && (
          <p className="text-sm text-verde">Cuenta creada. Ya puede entrar con ese correo.</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cerrar</Boton>
          <Boton variante="acento" disabled={enviando} onClick={() => void crear()}>
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </Boton>
        </div>
      </div>
    </Hoja>
  )
}

function FichaTecnico({
  tecnico,
  abierta,
  alCerrar,
  alGuardar,
}: {
  tecnico: Tecnico | null
  abierta: boolean
  alCerrar: () => void
  alGuardar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState(tecnico?.id ?? 'nuevo')

  // Al abrir otra ficha hay que recargar los campos: el formulario es el mismo.
  if (clave !== (tecnico?.id ?? 'nuevo')) {
    setClave(tecnico?.id ?? 'nuevo')
    setNombre(tecnico?.nombre ?? '')
    setRol(tecnico?.rol ?? '')
    setTelefono(tecnico?.telefono ?? '')
    setEmail(tecnico?.email ?? '')
  }

  async function guardar() {
    if (!nombre.trim()) return
    const datos = {
      nombre: nombre.trim(),
      rol: rol.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
    }
    if (tecnico) await guardarTecnico(tecnico.id, datos)
    else await crearTecnico({ ...datos, orden: 100 })
    alGuardar()
    alCerrar()
  }

  async function alternarActivo() {
    if (!tecnico) return
    await guardarTecnico(tecnico.id, { activo: !tecnico.activo })
    alGuardar()
    alCerrar()
  }

  return (
    <Hoja
      abierta={abierta}
      titulo={tecnico ? 'Editar persona' : 'Agregar persona'}
      alCerrar={alCerrar}
    >
      <div className="space-y-3">
        <Campo etiqueta="Nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} />
        <Campo
          etiqueta="Cargo"
          value={rol}
          onChange={e => setRol(e.target.value)}
          placeholder="Supervisor técnico"
        />
        <div className="grid grid-cols-2 gap-2">
          <Campo
            etiqueta="Teléfono"
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
          />
          <Campo
            etiqueta="Correo"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <p className="text-xs text-faint">
          Esto no crea una cuenta para entrar a la app. Es la persona y su dotación.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="acento" onClick={() => void guardar()}>
            Guardar
          </Boton>
        </div>
        {tecnico && (
          <Boton className="w-full" onClick={() => void alternarActivo()}>
            {tecnico.activo ? 'Marcar como inactivo' : 'Volver a activar'}
          </Boton>
        )}
      </div>
    </Hoja>
  )
}
