import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Hoja } from './ui'
import { borrarVisita, crearVisita, guardarProspecto } from '../lib/datos'
import { hoyIso, sumarDias } from '../lib/formato'
import { ESTADOS_PROSPECTO, type EstadoProspecto, type Prospecto } from '../lib/tipos'

/*
  Registro de visita en un toque.

  Caminando, entrar a la ficha y llenar un formulario cuesta tres pantallas por
  local. Acá se abre, se toca el resultado y listo: se guarda la visita, cambia
  el estado de gestión y —cuando corresponde— queda agendado volver a pasar.
  Lo que se escribe con calma (equipos, contacto, notas) se agrega después desde
  la ficha.
*/

interface ResultadoRapido {
  etiqueta: string
  estado: EstadoProspecto
  volverEnDias?: number
}

const RESULTADOS: ResultadoRapido[] = [
  { etiqueta: 'Quedó interesado', estado: 'interesado', volverEnDias: 3 },
  { etiqueta: 'Evaluación agendada', estado: 'evaluacion', volverEnDias: 2 },
  { etiqueta: 'Pidió volver', estado: 'interesado', volverEnDias: 7 },
  { etiqueta: 'No estaba quien decide', estado: 'visitado', volverEnDias: 2 },
  { etiqueta: 'No le interesa', estado: 'descartado' },
  { etiqueta: 'Local cerrado', estado: 'descartado' },
]

/** Lo necesario para deshacer un registro hecho sin querer. */
export interface Deshacer {
  mensaje: string
  revertir: () => Promise<void>
}

export function RegistroRapido({
  prospecto,
  alCerrar,
  alGuardar,
}: {
  prospecto: Prospecto | null
  alCerrar: () => void
  alGuardar: (deshacer: Deshacer) => void
}) {
  const [guardando, setGuardando] = useState<string | null>(null)

  async function registrar(r: ResultadoRapido) {
    if (!prospecto) return
    setGuardando(r.etiqueta)

    const previo = {
      estado: prospecto.estado,
      visitado_en: prospecto.visitado_en,
      resultado: prospecto.resultado,
      proximo_paso: prospecto.proximo_paso,
      proximo_paso_en: prospecto.proximo_paso_en,
    }

    const { data: visita } = await crearVisita({
      prospecto_id: prospecto.id,
      tipo: 'prospeccion',
      fecha: hoyIso(),
      resumen: r.etiqueta,
      proximo_paso: r.volverEnDias ? 'Volver a pasar' : null,
      proximo_paso_en: r.volverEnDias ? sumarDias(r.volverEnDias) : null,
    })

    await guardarProspecto(prospecto.id, {
      estado: r.estado,
      visitado_en: hoyIso(),
      resultado: r.etiqueta,
      proximo_paso: r.volverEnDias ? 'Volver a pasar' : prospecto.proximo_paso,
      proximo_paso_en: r.volverEnDias ? sumarDias(r.volverEnDias) : prospecto.proximo_paso_en,
    })

    setGuardando(null)
    alCerrar()
    alGuardar({
      mensaje: `${prospecto.nombre}: ${r.etiqueta.toLowerCase()}`,
      revertir: async () => {
        if (visita?.id) await borrarVisita(visita.id)
        await guardarProspecto(prospecto.id, previo)
      },
    })
  }

  return (
    <Hoja abierta={prospecto !== null} titulo={prospecto?.nombre ?? ''} alCerrar={alCerrar}>
      <p className="mb-3 text-sm text-mut">
        ¿Cómo quedó la visita? Se guarda al tocar, y después puedes deshacerlo.
      </p>
      <div className="space-y-2">
        {RESULTADOS.map(r => {
          const pinta = ESTADOS_PROSPECTO[r.estado]
          return (
            <button
              key={r.etiqueta}
              onClick={() => registrar(r)}
              disabled={guardando !== null}
              className="flex w-full items-center gap-3 rounded-xl border border-linea bg-white px-4 py-3 text-left disabled:opacity-50"
            >
              <span className={`size-3 shrink-0 rounded-full ${pinta.punto}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{r.etiqueta}</span>
                <span className="block text-xs text-faint">
                  Queda como «{pinta.corta.toLowerCase()}»
                  {r.volverEnDias ? ` · volver en ${r.volverEnDias} días` : ''}
                </span>
              </span>
              {guardando === r.etiqueta && <span className="text-xs text-faint">guardando…</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Boton onClick={alCerrar}>Cancelar</Boton>
        {prospecto && (
          <Link to={`/prospectos/${prospecto.id}`}>
            <Boton className="w-full">Abrir ficha</Boton>
          </Link>
        )}
      </div>
    </Hoja>
  )
}
