/*
  La guía: cómo se usa la app y cómo se vende.

  Vive acá y no en la pantalla porque es contenido, no interfaz, y porque de
  aquí sale también la versión imprimible que está en la carpeta de la empresa.
  Editar la guía es editar este archivo.

  El libreto de venta no es un discurso para recitar. Son preguntas: el que
  pregunta controla la conversación, y el dueño de un local no compra
  «mantención preventiva», compra dejar de perder plata por algo concreto que
  le está pasando. El trabajo en la puerta es encontrar ese algo en treinta
  segundos.
*/

export type Bloque =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'pasos'; pasos: string[] }
  /** Lo que se dice en voz alta, tal cual. */
  | { tipo: 'decir'; texto: string }
  | { tipo: 'lista'; items: { titulo: string; texto: string }[] }

export interface SeccionGuia {
  id: string
  parte: 'app' | 'venta'
  titulo: string
  resumen: string
  bloques: Bloque[]
}

export const GUIA: SeccionGuia[] = [
  /* ── La app ───────────────────────────────────────────────────────────── */
  {
    id: 'antes',
    parte: 'app',
    titulo: 'Antes de salir',
    resumen: 'Armar el recorrido del día en dos minutos',
    bloques: [
      {
        tipo: 'pasos',
        pasos: [
          'Menú → Mapa.',
          'Arriba, elegir la zona del día: Plaza Egaña, Plaza Ñuñoa o Metro Irarrázaval.',
          'Filtrar por «Por visitar» para sacar de la vista los que ya se visitaron.',
          'Tocar «Planificar recorrido». Ordena los locales desde donde estás hacia el más cercano en cada paso, y dibuja el camino por las calles.',
          'La hoja que se abre dice cuánto es a pie y cuánto demora. Si son más de dos horas, conviene partir la zona en dos días.',
          '«Guardar como ruta» si se quiere repetir ese mismo recorrido otro día.',
        ],
      },
      {
        tipo: 'texto',
        texto:
          'Veinte locales por salida es una buena medida. Menos se siente poco y más cansa, y el cansancio se nota en la voz al tercer local.',
      },
    ],
  },
  {
    id: 'puerta',
    parte: 'app',
    titulo: 'En la puerta, después de hablar',
    resumen: 'Registrar la visita en diez segundos',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'Se registra saliendo del local, en la vereda, no adentro. Adentro se conversa; afuera se anota.',
      },
      {
        tipo: 'pasos',
        pasos: [
          'Prospectos → buscar el local por nombre, o tocarlo en el mapa.',
          'Botón «Registrar».',
          'Elegir cómo quedó la cosa. La app guarda el estado, la fecha y cuándo hay que volver.',
          'Si te equivocaste de local, abajo aparece «Deshacer» por doce segundos.',
        ],
      },
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'Quedó interesado',
            texto: 'Quiere que volvamos. Vuelve a la lista en tres días.',
          },
          { titulo: 'Pidió cotización', texto: 'Hay que mandarle precio. Vuelve en dos días.' },
          { titulo: 'No estaba quien decide', texto: 'Volver cuando esté. En dos días.' },
          {
            titulo: 'Dejé tarjeta, sin interés hoy',
            texto:
              'Queda visitado y vuelve en una semana. No se descarta: el no de octubre no es el no de diciembre.',
          },
          {
            titulo: 'Local cerrado',
            texto:
              'Queda constancia de que se pasó, pero el estado no cambia: el local sigue como estaba y vuelve en dos días, a otra hora.',
          },
          {
            titulo: 'No corresponde',
            texto: 'No tiene equipos de frío. Es el único que descarta el local.',
          },
        ],
      },
    ],
  },
  {
    id: 'nuevo',
    parte: 'app',
    titulo: 'Un local que no está en la lista',
    resumen: 'Sí se puede agregar, y conviene hacerlo en el momento',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'La lista de 333 locales salió de un mapa, y los mapas siempre están atrasados: hay locales nuevos, otros que cambiaron de nombre y otros que nunca figuraron.',
      },
      {
        tipo: 'pasos',
        pasos: [
          'Prospectos → botón «+» arriba a la derecha.',
          'Nombre y rubro. Con eso basta para guardar.',
          'Quién atendió: el nombre del que te habló vale más que el teléfono del local.',
          'Nota: qué equipos viste. «Dos visicooler y un split; el de atrás escarcha.»',
          '«Usar mi ubicación», estando parado en la puerta. Sin eso el local queda guardado pero invisible en el mapa.',
        ],
      },
      {
        tipo: 'texto',
        texto:
          'Después se registra la visita igual que cualquier otro, con el botón «Registrar».',
      },
    ],
  },
  {
    id: 'vuelta',
    parte: 'app',
    titulo: 'De vuelta en la casa',
    resumen: 'Diez minutos que evitan perder lo que se consiguió',
    bloques: [
      {
        tipo: 'pasos',
        pasos: [
          'Menú → Hoy: ahí están los que hay que volver a tocar y los que ya están atrasados.',
          'A los que pidieron cotización: Presupuestos → nuevo, y se manda el PDF por WhatsApp el mismo día.',
          'Un presupuesto que se manda al día siguiente vale la mitad: el dueño ya se olvidó de la conversación.',
        ],
      },
    ],
  },
  {
    id: 'vendido',
    parte: 'app',
    titulo: 'Cuando uno compra',
    resumen: 'De prospecto a cliente, sin volver a escribir nada',
    bloques: [
      {
        tipo: 'pasos',
        pasos: [
          'En la ficha del prospecto, «Convertir en cliente».',
          'En la ficha del cliente, cargar sus equipos: tipo, capacidad y dónde está cada uno. Esto define después qué te va a pedir medir.',
          'Mantenciones → Programar, con la frecuencia acordada. Al cerrar una visita, la siguiente queda agendada sola.',
          'Después del trabajo: Informes → Nuevo. Checklist, mediciones si las tienes, fotos, firma del cliente, y el PDF se manda antes de salir del local.',
        ],
      },
    ],
  },

  /* ── La venta ─────────────────────────────────────────────────────────── */
  {
    id: 'entrada',
    parte: 'venta',
    titulo: 'La entrada',
    resumen: 'Treinta segundos, y no son para vender',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'El objetivo de la primera visita no es vender: es que te identifiquen y saber qué le duele. Si sales con eso, la visita fue buena aunque no te compren.',
      },
      { tipo: 'decir', texto: 'Hola, buenas. ¿Quién ve el tema de los equipos de frío acá?' },
      {
        tipo: 'texto',
        texto:
          'Esa es la primera frase, siempre. No te presentes todavía: averigua primero a quién le tienes que hablar. Venderle al cajero es perder la visita completa.',
      },
      {
        tipo: 'decir',
        texto:
          'Soy Lorenzo, de Calor y Frío Industrial. Andamos trabajando acá en el barrio con mantención de equipos de frío y aire acondicionado. Le dejo mi tarjeta.',
      },
      {
        tipo: 'texto',
        texto:
          'Y ahí te callas. El silencio después de la tarjeta hace que el otro hable, y lo que diga es el dato que viniste a buscar.',
      },
    ],
  },
  {
    id: 'preguntas',
    parte: 'venta',
    titulo: 'Las preguntas, no el discurso',
    resumen: 'El que pregunta manda la conversación',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'Nadie compra «mantención preventiva». Compra dejar de perder plata por algo que le está pasando. Tu trabajo es encontrar ese algo con dos o tres preguntas.',
      },
      {
        tipo: 'texto',
        texto:
          'Preguntas abiertas, nunca de sí o no. Y después de preguntar, callarse: la incomodidad del silencio la llena él.',
      },
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'Repetir lo que dijo',
            texto:
              'Si te dice «el visicooler está medio flojo», contestas «¿flojo cómo, no enfría o hace ruido?». Nombrar el problema con sus palabras vale más que cualquier argumento.',
          },
          {
            titulo: 'Preguntar desde cuándo',
            texto:
              'Un problema con fecha es un problema real. «¿Desde cuándo le pasa?» separa la molestia de la urgencia.',
          },
          {
            titulo: 'Preguntar quién se lo ve',
            texto:
              '«¿Tienen alguien fijo o llaman cuando falla?» Casi siempre es lo segundo, y ahí entra lo que hacemos distinto.',
          },
        ],
      },
    ],
  },
  {
    id: 'minimarket',
    parte: 'venta',
    titulo: 'Minimarket y almacén',
    resumen: 'La bebida tibia y la cuenta de la luz',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'Equipos típicos: uno o dos visicooler de bebidas, una congeladora de helados, a veces una cámara chica y un split en la sala.',
      },
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'La bebida tibia es venta perdida',
            texto:
              'A las seis de la tarde de un día de calor, el que saca una bebida tibia la deja y compra en otro lado. No vuelve ese día ni al siguiente.',
          },
          {
            titulo: 'La escarcha se come el helado',
            texto:
              'Un congelador que escarcha consume más, cierra mal y cristaliza el producto. El helado cristalizado no se vende: se bota.',
          },
          {
            titulo: 'El condensador sucio se paga en la boleta de la luz',
            texto:
              'La parrilla de atrás tapada de polvo hace que el compresor trabaje de más todo el día. Es el costo que nadie ve y que corre todos los meses.',
          },
        ],
      },
      {
        tipo: 'decir',
        texto: '¿Las bebidas le salen bien frías a las seis de la tarde, o se le entibian?',
      },
      { tipo: 'decir', texto: '¿El congelador le escarcha mucho, se le llena de hielo?' },
      {
        tipo: 'decir',
        texto:
          '¿Hace cuánto no le limpian el condensador del visicooler, la parrilla de atrás?',
      },
    ],
  },
  {
    id: 'restaurante',
    parte: 'venta',
    titulo: 'Restaurante y comida rápida',
    resumen: 'La cámara que se cae un sábado',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'Equipos típicos: cámara de frío o de congelado, mostrador refrigerado, máquina de hielo, splits de sala y cocina, campana de extracción.',
      },
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'La cámara es el dolor más caro',
            texto:
              'Si se cae un viernes en la noche, el sábado se pierde todo lo que hay adentro. Preguntar cuánto hay guardado ahora mismo convierte el riesgo en una cifra.',
          },
          {
            titulo: 'La autoridad sanitaria pide temperatura',
            texto:
              'Una cámara fuera de rango es un problema con la Seremi, no sólo con la mercadería. El informe de cierre que entregamos deja la temperatura por escrito.',
          },
          {
            titulo: 'La sala caliente baja el ticket',
            texto:
              'Con calor el cliente no pide postre ni café, come rápido y se va. El dueño lo siente en la caja antes de entender por qué.',
          },
          {
            titulo: 'La cocina a cuarenta grados rota al personal',
            texto:
              'Un cocinero que no aguanta el calor renuncia, y encontrar reemplazo cuesta más que la mantención del año.',
          },
          {
            titulo: 'La campana con grasa es riesgo de incendio',
            texto:
              'Y el olor se va a la sala. Es un trabajo que casi nadie ofrece y que todos necesitan.',
          },
        ],
      },
      { tipo: 'decir', texto: '¿La cámara le ha fallado alguna vez con el local lleno?' },
      {
        tipo: 'decir',
        texto: '¿Cuánta mercadería tiene adentro ahora, más o menos?',
      },
      {
        tipo: 'decir',
        texto: '¿Quién les ve los equipos: tienen a alguien fijo o llaman cuando algo falla?',
      },
    ],
  },
  {
    id: 'objeciones',
    parte: 'venta',
    titulo: 'Lo que te van a decir',
    resumen: 'Las cinco respuestas que se repiten',
    bloques: [
      {
        tipo: 'lista',
        items: [
          {
            titulo: '«Ya tengo técnico»',
            texto:
              'Responder: «Me parece bien. ¿Le hace mantención programada o lo llama cuando algo se echa a perder?» Casi siempre es lo segundo, y ahí está la diferencia: nosotros vamos antes.',
          },
          {
            titulo: '«Está todo funcionando bien»',
            texto:
              'Responder: «Mejor así. La mantención es justamente para los que están bien, porque cuando falla ya es caro. ¿Le parece que le eche una mirada igual? No tiene costo.»',
          },
          {
            titulo: '«No es el momento, no tengo presupuesto»',
            texto:
              'Responder: «Lo entiendo. Le dejo la tarjeta igual. Y si algo deja de enfriar, llámeme: la primera visita no le cuesta.» No insistir. Registrar y volver en un mes.',
          },
          {
            titulo: '«Déjame tu número y yo te llamo»',
            texto:
              'Eso casi nunca pasa. Responder: «Se lo dejo. Pero para no andar molestándolo: ¿le parece que pase el jueves a esta misma hora y le echo una mirada? Son diez minutos.» Una fecha vale más que un teléfono.',
          },
          {
            titulo: '«¿Cuánto cuesta?»',
            texto:
              'No esquivar el precio: la mantención de un split parte en $38.000 más IVA y la de un visicooler en $35.000. Y agregar: «pero antes de cobrarle quiero ver qué tiene, porque a veces es menos de lo que uno cree».',
          },
        ],
      },
    ],
  },
  {
    id: 'cierre',
    parte: 'venta',
    titulo: 'El cierre',
    resumen: 'No te vayas sin fecha',
    bloques: [
      {
        tipo: 'texto',
        texto:
          'Toda visita termina en una de dos cosas: una fecha, o un descarte. «Lo voy a pensar» no es ninguna de las dos, y es la respuesta que más se escucha.',
      },
      {
        tipo: 'decir',
        texto:
          '¿Le parece que pase el jueves a las cuatro y le reviso los equipos? Son diez minutos y le dejo por escrito cómo están, sin costo.',
      },
      {
        tipo: 'texto',
        texto:
          'La revisión sin costo no es regalar trabajo: es la forma de entrar. Con las mediciones en la mano, la cotización deja de ser una opinión y se vuelve difícil de discutir.',
      },
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'Estamos entrando al verano',
            texto:
              'Úsalo: «conviene verlo ahora, porque en enero no va a encontrar técnico disponible y el repuesto se demora». Es verdad y es urgencia honesta.',
          },
        ],
      },
    ],
  },
  {
    id: 'nohacer',
    parte: 'venta',
    titulo: 'Lo que no hay que hacer',
    resumen: 'Seis errores que cuestan la visita',
    bloques: [
      {
        tipo: 'lista',
        items: [
          {
            titulo: 'Entrar en hora punta',
            texto:
              'Restaurantes entre 15:30 y 18:00, después del almuerzo. Minimarkets entre 10:00 y 12:00. En hora punta molestas y te recuerdan por eso.',
          },
          {
            titulo: 'Hablarle al que no decide',
            texto: 'Primera pregunta siempre: quién ve el tema de los equipos.',
          },
          {
            titulo: 'Dar precio antes de ver',
            texto:
              'Un precio sin haber visto el equipo es una apuesta, y si queda corto hay que cobrar más después o perder plata.',
          },
          {
            titulo: 'Hablar en técnico',
            texto:
              'Nadie compra sobrecalentamiento ni subenfriamiento. Se habla de bebida tibia, de cuenta de la luz y de mercadería perdida.',
          },
          {
            titulo: 'Discutir con el que dice que no',
            texto:
              'El no de hoy es el sí de diciembre si quedaste bien. Insistir lo convierte en un no definitivo.',
          },
          {
            titulo: 'Irse sin registrar',
            texto:
              'Lo que no se anota en la vereda se olvida en el tercer local. Para eso está el botón «Registrar».',
          },
        ],
      },
    ],
  },
]
