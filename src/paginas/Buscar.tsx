import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Buscador, Cargando, Pantalla, Rotulo, Tarjeta, Vacio } from '../componentes/ui'
import { buscarEnTodo, type Hallado } from '../lib/datos'

/*
  Buscar en todo.

  Cada pantalla tiene su buscador, y eso sirve cuando uno ya sabe dónde está la
  cosa. En la calle pasa al revés: uno se acuerda del nombre del local y no de
  si quedó como prospecto, como cliente o como presupuesto.

  La consulta sale sola mientras se escribe, pero con un respiro: siete
  consultas por cada tecla serían siete consultas por cada tecla.
*/

const ETIQUETAS: Record<Hallado['tipo'], string> = {
  prospecto: 'Prospecto',
  cliente: 'Cliente',
  negocio: 'Negocio',
  presupuesto: 'Presupuesto',
  informe: 'Informe',
  proveedor: 'Proveedor',
  insumo: 'Inventario',
}

const ORDEN: Hallado['tipo'][] = [
  'cliente', 'prospecto', 'negocio', 'presupuesto', 'informe', 'proveedor', 'insumo',
]

export function Buscar() {
  const [texto, setTexto] = useState('')
  const pedido = useRef(0)

  /*
    El resultado se guarda junto al texto que lo produjo.

    Así «está buscando» se deduce —lo que hay en pantalla no corresponde a lo
    que está escrito— en vez de ser otro estado que hay que acordarse de
    apagar, y el efecto no fija nada hasta que llega la respuesta.
  */
  const [resultado, setResultado] = useState<{ para: string; lista: Hallado[] }>({
    para: '',
    lista: [],
  })

  const consulta = texto.trim()
  const corto = consulta.length < 2
  const buscando = !corto && resultado.para !== consulta

  useEffect(() => {
    if (consulta.length < 2) return
    const mio = ++pedido.current
    const espera = setTimeout(() => {
      void buscarEnTodo(consulta).then(lista => {
        // Si mientras tanto se siguió escribiendo, esta respuesta ya no sirve.
        if (mio === pedido.current) setResultado({ para: consulta, lista })
      })
    }, 350)
    return () => clearTimeout(espera)
  }, [consulta])

  const hallados = resultado.para === consulta ? resultado.lista : []
  const grupos = ORDEN.map(tipo => [tipo, hallados.filter(h => h.tipo === tipo)] as const).filter(
    ([, lista]) => lista.length > 0,
  )

  return (
    <Pantalla titulo="Buscar" bajada="En locales, clientes, negocios y papeles" volver>
      <Buscador valor={texto} alCambiar={setTexto} marcador="Nombre del local, número, código" />

      {corto ? (
        <p className="mt-4 text-sm text-mut">
          Escribe dos letras y empieza a buscar. Sirve el nombre de un local, el número de un
          presupuesto o el código de una herramienta.
        </p>
      ) : buscando ? (
        <Cargando />
      ) : hallados.length === 0 ? (
        <div className="mt-4">
          <Vacio texto={`Nada con «${consulta}».`} />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {grupos.map(([tipo, lista]) => (
            <section key={tipo}>
              <Rotulo className="mb-2">
                {ETIQUETAS[tipo]} · {lista.length}
              </Rotulo>
              <ul className="space-y-2">
                {lista.map(h => (
                  <li key={tipo + h.id}>
                    <Link to={h.ruta}>
                      <Tarjeta className="p-3">
                        <p className="truncate font-medium">{h.titulo}</p>
                        {h.detalle && (
                          <p className="truncate text-sm text-mut">{h.detalle}</p>
                        )}
                      </Tarjeta>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Pantalla>
  )
}
