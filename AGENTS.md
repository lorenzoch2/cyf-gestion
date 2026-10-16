# AGENTS.md — CyF Gestión

## Qué es esto

Aplicación interna de Calor y Frío Industrial SpA para gestionar el negocio desde el teléfono:
prospectos, clientes, negocios, pendientes, tarifario y presupuestos. **Dos usuarios**, ambos con
acceso total. No es el sitio público (ese es el repo `caloryfrioindustrial`).

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | React 19 + TypeScript |
| Build | Vite 8 |
| Estilos | Tailwind 4 con tokens de marca en `src/estilos.css` |
| Rutas | React Router 7, modo SPA |
| Datos y sesión | Supabase (Postgres + Auth) |
| Hosting | Netlify (estático + redirección SPA) |

## Estructura

```
supabase/
  schema.sql            # tablas, índices, triggers y políticas RLS
  seed-servicios.sql    # tarifario
  seed-prospectos.sql   # los 333 locales de la campaña (OpenStreetMap, ODbL)
  migracion-02-*.sql    # estados de gestión, rutas y tarifarios por zona o cliente
src/
  lib/
    supabase.ts         # el cliente; null si faltan las variables
    sesion.tsx          # contexto de sesión (entrar / salir)
    datos.ts            # una función por consulta + el hook useConsulta
    tipos.ts            # filas de la base y etiquetas para mostrar
    formato.ts          # pesos, fechas, distancias, enlaces de teléfono y mapa
    ruteo.ts            # el recorrido trazado por las calles (Valhalla/OSM)
    pdf.ts              # el presupuesto en PDF, compuesto en el navegador
    ruteo.ts            # el recorrido trazado por las calles (Valhalla/OSM)
    cuentas.ts          # pedirle a la función de Netlify que cree un usuario
  componentes/          # ui.tsx (piezas), Navegacion.tsx, iconos.tsx
  paginas/              # una por pantalla
```

## Decisiones tomadas — no relitigar

- **Sin servidor propio.** El navegador habla directo con Supabase. Lo que protege los datos son
  las políticas RLS, no el código de la app.
- **La clave `service_role` no entra nunca al repo ni al navegador.** Solo la `anon`/publishable,
  que es pública por diseño.
- **Sin librería de caché.** `useConsulta` hace la consulta y expone `recargar()`. Son dos usuarios
  y pantallas chicas; un caché que invalidar costaría más de lo que ahorra.
- **Nombres en castellano**, igual que en el repo del sitio: `Pantalla`, `Boton`, `consultarProspectos`.
- **Mobile-first de verdad.** Barra de navegación abajo (ahí llega el pulgar), hojas que suben desde
  el borde inferior, campos de 16 px —bajo eso iOS hace zoom al enfocar— y `env(safe-area-inset-*)`
  para la barra de gestos.
- **El registro rápido guarda al toque, y por eso existe «Deshacer».** En la lista y en el mapa,
  tocar un resultado escribe la visita y mueve el estado de gestión sin pasos intermedios: es el
  gesto que se hace caminando. El seguro no es una confirmación previa sino el aviso con
  «Deshacer», que revierte el estado y borra la visita. Ver `RegistroRapido` y `Aviso`.
- **Nada se guarda sin confirmar.** Abrir una hoja y cerrarla no escribe nada: toda hoja tiene
  «Cancelar» junto a «Guardar», y lo que no se puede deshacer pasa por `Confirmar`. Es una app
  que se usa caminando: un toque en la pantalla equivocada no puede costar un registro. La
  excepción deliberada son las pastillas de estado de gestión, donde el toque **es** la acción.
- **El PDF se compone en el teléfono, no en un servidor.** `pdf.ts` arma el documento con jsPDF,
  con las tipografías de la marca incrustadas y el logotipo como imagen, y lo entrega por el menú
  de compartir del sistema. Dos cuidados que costaron encontrar: `compress: true` en el
  constructor —sin eso la imagen entra como mapa de bits crudo y el archivo pesa 1,6 MB en vez
  de 54 KB— y el módulo se importa sólo al pedir el PDF, porque jsPDF más las fuentes son
  130 KB comprimidos que nadie necesita para ver un pendiente.
- **Un precio se resuelve en cascada**: tarifario del cliente → de su zona → general. Un
  tarifario especial sólo guarda lo que de verdad cambia; el resto lo hereda. Esa lógica vive en
  `tarifarioQueAplica()` y no debe duplicarse en las pantallas.
- **El mapa agrupa sin librería.** `Pines` junta los locales por celdas de 58 px calculadas con
  `mapa.project()` al zoom actual: lo que se ve encimado se junta y al acercarse se abre solo.
  No se usó un plugin de clustering porque hacía falta que el grupo se pintara con el estado
  más avanzado que contiene —`PESO_ESTADO`— y porque los puntos sueltos se dibujan en canvas,
  que aguanta 333 sin pestañear. Con un recorrido planificado no se agrupa: ahí importa ver
  cada parada con su número.
- **El recorrido se traza por las calles, a pie.** `ruteo.ts` se lo pregunta a Valhalla en la
  instancia pública de OpenStreetMap: sin llave ni tarjeta, y con perfil `pedestrian` porque la
  prospección se hace caminando —el perfil de auto haría dar tres cuadras de vuelta para cruzar
  a la vereda de enfrente de Irarrázaval—. El servidor acepta diez paradas por consulta, así que
  un recorrido largo se pide por trozos que se solapan en la parada del borde.
- **Si el ruteador no contesta, vuelve la línea recta punteada** y la hoja lo dice con todas sus
  letras. Medir el camino es una ayuda para planificar el día, no un requisito para salir a la
  calle: la app tiene que servir igual con mala señal.
- **Se traza y se mide el tramo de una jornada: `MAX_TRAZADO` paradas.** Las mismas que el mapa
  numera y que la hoja lista. Ordenar 150 locales sirve para saber por dónde seguir; trazarlos
  todos sería pedirle al servidor —y al teléfono— un recorrido que nadie va a caminar.
- **El color del estado de gestión es uno solo** y vive en `ESTADOS_PROSPECTO` (`tipos.ts`):
  el mismo en la lista, en la ficha y —cuando llegue— en el mapa.
- **Latón para la acción, acero para la estructura.** El botón de latón lleva texto grafito, nunca
  blanco: es la regla de contraste del manual de marca.

## Cuidados

- **Las variables de Vite se leen al compilar.** Cambiar `.env.local` exige reiniciar `npm run dev`;
  en Netlify, volver a desplegar.
- **El tarifario existe en dos lados**: la tabla `servicios` y el documento
  `_Fuentes/04 Comercial/Tarifario/Tarifario de servicios 2026.md` en la carpeta de la empresa. El documento
  es el oficial; si cambia un precio, cambia en los dos.
- **La numeración de presupuestos** (`AAAA-NNN`) es la misma de la empresa. Antes de usar un número
  nuevo, revisar que no choque con `_Fuentes/04 Comercial/Presupuestos/_Registro de presupuestos.md`.
- **Los documentos de la carpeta de la empresa se escriben en markdown y se leen en PDF.** La
  fuente vive en `_Fuentes/<misma ruta>.md` y el PDF que se abre queda en la ruta sin `_Fuentes`.
  Para cambiar uno se edita el markdown y se vuelve a componer con
  `_Herramientas/Componer documentos/componer-documentos.py`; escribir un `.md` suelto en el
  directorio lo deja fuera de esa rutina.
- Los prospectos vienen de OpenStreetMap con licencia ODbL: si alguna vez se publican, hay que
  atribuir la fuente.

## Inventario y dotación

- **El catálogo se genera, no se escribe a mano.** `herramientas/catalogo.py` es la fuente de los
  153 ítems: de ahí salen `supabase/seed-dotacion.sql` y la hoja imprimible que vive en la carpeta
  de la empresa. Editar el catálogo es editar ese script y volver a correrlo.
- **Cada ítem tiene un ámbito.** `T` se repite por técnico, `E` es de la empresa y `V` vive en la
  camioneta. Sin esa distinción la pregunta «¿tienen los dos lo mismo?» no se puede responder, que
  es justamente para lo que se hizo el módulo.
- **Un técnico no es una cuenta de acceso.** Francisco tiene dotación aunque nunca entre a la app.
  La tabla `tecnicos` guarda personas; `usuario_id` enlaza con una cuenta sólo si algún día existe.
  Mezclarlas obligaría a crear una cuenta para poder registrar una caja de herramientas.
- **`tecnico_id` nulo significa «de la empresa, sin asignar»**, y es un dueño más. Así entró tal
  cual el inventario de junio de 2026, que nunca dijo de quién era cada herramienta. Por eso la
  unicidad va en un índice con `coalesce`: en SQL dos nulos no son iguales, y aquí tienen que
  serlo.
- **Un ítem sin fila de existencia se muestra como «falta»**, no como error. Nadie va a crear 153
  filas antes de empezar a usar la pantalla.
- **Los estados son cuatro y separan tenencia de compra**: `tiene`, `falta`, `agotado` (se usó o se
  gastó) y `baja`. El avance de la compra vive aparte, en `cotizaciones_insumo`; marcar una
  cotización como comprada es lo que deja el ítem en «tiene», en un solo gesto y no en dos
  pantallas.
- **Las referencias técnicas del catálogo citan el curso de la Unidad Ozono** (Ministerio del Medio
  Ambiente, 2018), que está en la carpeta de la empresa. Lo que la norma exige —recuperadora,
  cilindro de recuperación, vacío bajo 500 micrones— va marcado como crítico y no es opinión.

## La portada

La barra de abajo lleva cinco destinos porque son los que caben bajo el pulgar. **Cuando aparece un
módulo nuevo va al menú de la portada, no a la barra.** `/` es el menú y `/hoy` la pantalla del día;
`/mas` quedó redirigido para que no se rompan los enlaces viejos.

## Crear cuentas

La llave `service_role` de Supabase puede leer y escribir cualquier tabla saltándose las políticas.
**Nunca entra al navegador ni al repositorio.** Vive en las variables de entorno de Netlify y sólo
la toca `netlify/functions/crear-usuario.mts`, que corre en el servidor y además exige que quien
llama venga con una sesión válida de la app. En desarrollo la función no existe y la pantalla lo
dice en vez de fallar en silencio.

**No se duplican variables.** La función lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, que el
sitio ya tiene configuradas para compilar: el prefijo `VITE_` sólo le importa a Vite —marca lo que
puede viajar al navegador— y para una función de Netlify son variables de entorno como cualquier
otra. Lo único que hay que agregar en Netlify es `SUPABASE_SECRET_KEY` (Project Settings → API Keys
→ Secret keys; en proyectos antiguos es la `service_role`).

## Compras

- **Las órdenes de compra son las que la empresa emite a un proveedor.** No confundir con las que
  un cliente le emite a la empresa —como la de un cliente de mayo de 2026, que está en
  `04 Comercial/Órdenes de Compra` de la carpeta—: esas son venta.
- **Un proveedor declara cuántos días dura su cotización** (`validez_dias`). un distribuidor cotiza a tres
  días corridos y su lista de precios dura una semana. Al guardar una cotización la app calcula el
  vencimiento sola y después marca en naranja el precio muerto. Cotizarle al cliente con 30 días de
  validez apoyado en un precio de tres es una pérdida esperando ocurrir, y era un problema real.
- **«Traer lo que falta» es donde el inventario y las compras se tocan.** Toma los ítems en «falta»
  o «se acabó» que ese proveedor ya cotizó, se queda con el precio más barato de cada uno y arma
  las líneas. Reescribirlos a mano era la parte que nadie iba a hacer.
- **Recibir una orden deja todo lo que traía en «lo tenemos».** El paso contrario —comprar y
  después ir ítem por ítem al inventario— es exactamente el que se olvida.
- Los precios se guardan **netos**, como los entrega el proveedor; el IVA lo pone la pantalla.

## Mantenciones programadas

- **`visitas` es lo que ya pasó; `mantenciones` es lo que falta por hacer.** Separarlas evita la
  tentación de anotar una visita futura como si ya hubiera ocurrido, que es como se ensucia una
  bitácora.
- **`equipo_id` nulo significa «todo el local».** En un minimarket con cuatro splits se programa una
  visita, no cuatro.
- **La frecuencia viaja en la mantención, no sólo en el contrato.** Una cámara de frío se ve cada
  tres meses aunque el resto del local sea semestral.
- **Cerrar una mantención agenda la siguiente, en el mismo gesto.** Es el motor del ingreso
  recurrente: si la próxima no queda agendada al cerrar la anterior, no la agenda nadie. Por eso
  `cerrarMantencion()` hace las dos cosas y no hay una pantalla aparte que haya que acordarse de
  abrir. De paso actualiza `ultima_mantencion` del equipo.
- La pantalla ordena por urgencia —atrasadas, esta semana, este mes, más adelante— porque esa es la
  única pregunta del lunes en la mañana.

## Cuidado al desarrollar

**Si Vite dice que un módulo «does not provide an export» que sí existe, reinicia el servidor.**
Agregar exports a `datos.ts` con el servidor corriendo deja la transformación vieja cacheada y el
error sobrevive incluso a recargar la página. `rm -rf node_modules/.vite` y volver a levantar.

## Informes de cierre

- **Uno por visita, no por equipo.** En un minimarket con cuatro splits y un visicooler sale un
  documento con cinco bloques adentro. Emitir cinco informes por una visita es la forma más rápida
  de que nadie los lea.
- **Las mediciones son opcionales, a propósito.** Hoy faltan la pinza amperimétrica, el vacuómetro
  y el anemómetro; un formulario obligatorio que no se puede llenar termina con gente inventando
  números. Las secciones vacías no se dibujan en el PDF.
- **La lista de tareas y de mediciones vive en `tipos.ts`, por familia de equipo.** Un split no
  tiene deshielo y una cámara no entrega caudal. La familia se deduce del tipo de equipo con una
  expresión regular — si aparece un tipo que no calza, cae en climatización.
- **El refrigerante va en el bloque del equipo, no en una tabla aparte.** Se mueve por máquina, y es
  el dato que la NCh 3241 espera que se pueda demostrar: el PDF imprime la línea que dice que el gas
  fue a un cilindro y no a la atmósfera.
- **La firma se guarda como data URL en una columna de texto**, no en el almacenamiento. Son unos
  10 KB, y así cerrar en terreno no depende de que el bucket responda, que es justo donde la señal
  falla.
- **Las fotos sí van al almacenamiento, en un bucket privado.** Una foto del interior de un local es
  del cliente, no del internet: se guarda la ruta y la app baja el archivo con la sesión de quien
  mira. Se comprimen antes de subir —1600 px de lado largo, calidad 0,72— porque la subida ocurre
  con la señal de un local y porque esas mismas imágenes entran al PDF.
- **Emitir el informe mueve tres cosas de una vez**: lo cierra, descuenta del inventario los
  consumibles usados y cierra la mantención programada que lo originó, con su siguiente ya agendada.
  Repartirlo en tres pantallas garantizaba que dos se olvidaran.
- **Los hallazgos son la razón comercial del informe.** De ahí sale el próximo presupuesto: una
  mantención de $38.000 se convierte en un trabajo de $300.000 porque alguien anotó que el
  condensador estaba tapado.

## Documentos con vencimiento

- **La app no guarda los archivos.** Viven en la carpeta de la empresa, en OneDrive, que es donde el
  contador y el banco los van a buscar. Acá va la fecha y dónde está, que es lo único que se olvida.
- **`aviso_dias` es por documento, no un número fijo.** Una patente municipal se renueva con mes y
  medio de holgura; un certificado de vigencia se pide y llega el mismo día. Un aviso único para
  todo, o grita demasiado pronto o avisa tarde.
- **Los documentos sugeridos no traen fecha.** Inventarle un vencimiento a un documento es peor que
  no tenerlo anotado: la lista sólo rellena nombre, ámbito, aviso y dónde vive.
- **La portada carga tres cuentas**: lo que falta reponer, las mantenciones atrasadas y los
  documentos por renovar. Un módulo que hay que acordarse de abrir no avisa de nada.

## Diagnóstico

- **El diagnóstico va por equipo, no por visita.** En un local con cuatro máquinas, tres pueden
  estar sanas y una no. Vive en `informe_equipos`: síntoma que reporta el cliente, qué se descartó,
  causa probable y severidad.
- **`diagnostico.ts` lee las mediciones, no diagnostica.** Ordena lo que los números insinúan, con
  el porqué a la vista, para que el técnico confirme o descarte. Un sobrecalentamiento alto con
  subenfriamiento bajo apunta a falta de refrigerante, pero también puede ser una válvula mal
  regulada; eso lo decide quien está frente a la máquina. La pantalla lo dice con esas palabras.
- **Existe igual porque el razonamiento de un buen técnico se puede escribir**, y tenerlo escrito
  sirve para que el informe explique en castellano por qué se propone un trabajo, para que no se
  pase por alto lo evidente al final de un día largo, y para que Francisco y Lorenzo lleguen a la
  misma conclusión frente a los mismos números.
- **Los rangos son orientación, no norma.** Vienen de la práctica del oficio y del curso de la
  Unidad Ozono. Un equipo puede estar sano fuera de rango y enfermo dentro, y por eso ninguna regla
  bloquea nada: sólo muestra.
- **`familiaDe()` vive en un solo lugar.** Estaba duplicada en la pantalla del informe y en el PDF;
  si se bifurca, el PDF imprime mediciones que la pantalla no pidió.
- **La ficha del equipo (`/equipos/:id`) es la historia clínica de la máquina.** El dato ya estaba
  en cada informe; lo que no había era dónde mirarlo junto. «El consumo pasó de 7,2 A en abril a
  9,4 A hoy» convence a un cliente mucho mejor que una opinión, y además está medido.
- **Un cambio chico entre visitas no se muestra.** Bajo el 10% —o bajo un punto entero— es la mano
  que midió, no la máquina.

## El aviso del inventario en la portada

Cuenta **lo crítico que no está y lo que se acabó**, no todo lo que falta por registrar. Un ítem sin
fila de existencia es «falta» por omisión, y la primera vuelta por el taller deja decenas así: un
aviso de «132 por reponer» se vuelve ruido y se deja de mirar a la semana.

## Caja

- **La app no reemplaza el libro de contabilidad.** Registra la caja y entrega las cifras del mes ya
  ordenadas; el libro y el F29 siguen siendo el registro formal. La pantalla lo dice con todas sus
  letras, porque una app que parece el libro termina siendo el libro sin que nadie lo decida.
- **Se guardan los tres montos: neto, IVA y total.** Podría calcularse uno desde otro, pero una
  boleta real trae el total redondeado y el neto que sale de dividir por 1,19 no siempre cuadra al
  peso. Guardar los tres deja que mande el documento, que es lo que el SII mira.
- **Sólo factura y boleta mueven IVA.** Una boleta de honorarios o una compra sin documento salen de
  la caja igual, pero no dan crédito fiscal. Mezclarlos infla el crédito y eso se paga con multa.
- **La retención de honorarios se anota a mano.** La tasa la fija la ley y sube todos los años; una
  tasa cableada en el código es una cifra equivocada esperando al próximo enero.
- **El IVA del mes se calcula sobre lo emitido y recibido, no sobre lo cobrado**, que es como se
  declara. El remanente arrastrado de meses anteriores no se intenta encadenar acá: esa cadena está
  en el libro, y el F29 se declara con la propuesta del SII.

## La guía

- **El contenido vive en `src/lib/guia.ts`, no en la pantalla.** Es contenido, no interfaz, y de ahí
  sale también la copia imprimible que está en `04 Comercial/Prospección` de la carpeta de la
  empresa. Si las dos dicen cosas distintas, manda la de la app.
- **Va plegada, una sección abierta a la vez.** Se lee de pie en la vereda antes de entrar a un
  local, con una mano. Una guía que hay que scrollear entera no se lee nunca.
- **Lo que se dice en voz alta va marcado distinto** —fondo latón, borde a la izquierda— para
  reconocerlo de un vistazo sin leerlo.
- El libreto son **preguntas, no discurso**: nadie compra «mantención preventiva», compra dejar de
  perder plata por algo concreto. Si alguna vez se reescribe, mantener esa forma.

## La columna

**La app es una columna de 512 px centrada, en cualquier pantalla** (`max-w-lg`, el mismo ancho que
la barra de navegación y que las hojas). Sin eso, en un notebook las tarjetas se estiran a 1.200 px
mientras la barra de abajo mide 512 y la app se ve rota. El lienzo del mapa es la única excepción:
ahí el ancho completo sirve.

## Agregar un local en la calle

El alta manual toma **quién atendió**, una **nota** y la **ubicación del teléfono**. Lo último no es
un lujo: un local agregado sin coordenadas no aparece nunca en el mapa, y el mapa es la pantalla con
que se sale a la calle — quedaría guardado y a la vez invisible justo donde hace falta verlo.

## Cuando la red falla

- **Una consulta que falla no puede verse igual que una lista vacía.** Las pantallas pintan
  `datos ?? []`, así que sin aviso la ficha de un cliente diría «sin equipos cargados» cuando lo que
  pasó es que no cargó nada — y uno sale a trabajar creyendo algo falso. En vez de repetir el manejo
  de error en veinticuatro pantallas, cada consulta reporta cómo le fue y `AvisoConexion` muestra
  una franja arriba cuando dejan de llegar. Un éxito borra la racha.
- **`useConsulta` atrapa el rechazo, no sólo el error devuelto.** Si el `fetch` se cae, la promesa
  se rechaza, el `await` lanza y sin `try` el `setCargando(false)` nunca corre: la pantalla queda en
  «Cargando…» para siempre y sin decir nada.
- **Supabase reintenta antes de rendirse: con la red cortada tarda unos siete segundos** en
  devolver el error. Al probar esto hay que esperar más de eso, o parece que quedó colgado.

## Detalles de terreno

- **Sin teléfono, «Llamar» y «WhatsApp» se reemplazan por «Anotar teléfono».** 309 de los 333
  locales no traen teléfono: eran dos botones apagados ocupando dos tercios de la pantalla más usada
  en la calle. Ahora ese espacio es la acción que corresponde justo ahí.
- **«Ver su caja» lleva el técnico en la dirección** (`/inventario?tecnico=…`) y el inventario abre
  en su caja, no en la del taller.
- **Los estados vacíos enseñan qué hacer y por qué.** «Sin equipos cargados» no dice nada; «de ahí
  sale qué se mide en cada visita» sí.

## Nada se registra de un roce

- **Un registro que nace de un toque accidental no es un registro: es basura que alguien va a tener
  que limpiar.** «Crear negocio» en la ficha del prospecto creaba la oportunidad sin monto y sin
  nada que revisar —el diálogo preguntaba, pero no había qué mirar—, y dejó dos negocios vacíos
  duplicados. Ahora abre una hoja con qué es, monto y etapa, y se registra con un botón final.
- **Y todo lo que se crea se puede borrar.** El caso completo era peor que el roce: se podía crear
  un negocio por equivocación y no existía forma de sacarlo de la lista.
- **Lo tipeado vive en el teléfono hasta que se confirma** (`useBorrador`). En la calle un
  formulario se interrumpe solo: entra una llamada, se cierra la hoja, se bloquea el teléfono.
  Perder lo escrito es poco trabajo y mucho dato, porque la segunda vez nadie lo vuelve a escribir.
  El borrador se olvida al registrar, y la hoja avisa cuando recuperó algo para que nadie crea que
  ya quedó guardado.
- `localStorage` se lee y se escribe dentro de `try`: en ventana privada tira excepción y el
  formulario tiene que seguir andando igual.
- **Esto no aplica al registro rápido de visitas.** Ahí la instantaneidad es la gracia, y por eso
  tiene «Deshacer» doce segundos en vez de confirmación previa.

## Hoy

La pantalla de la mañana ordena por quién se enoja si se olvida:

1. **Mantenciones comprometidas** —lo de hoy y lo atrasado— encabeza. Una mantención olvidada es el
   contrato recurrente que se cae, y el cliente no reclama: se va.
2. **Pendientes** propios.
3. **Se te pasaron** y **Volver a pasar hoy**, separados. Son dos cosas distintas a las ocho de la
   mañana: una es deuda y la otra es agenda.

## Buscar en todo

Cada pantalla tiene su buscador, y sirve cuando uno ya sabe dónde está la cosa. En la calle pasa al
revés: uno se acuerda del nombre del local y no de si quedó como prospecto, como cliente o como
presupuesto. `buscarEnTodo()` consulta siete tablas en paralelo y agrupa por tipo.

- **Las comas y los porcentajes se sacan del texto** antes de armar el filtro: son la sintaxis de
  PostgREST y colarlas rompe la consulta entera.
- **El resultado se guarda junto al texto que lo produjo**, así «está buscando» se deduce
  —lo que hay en pantalla no corresponde a lo escrito— en vez de ser otro estado que apagar. Y una
  respuesta que llega tarde, cuando ya se siguió escribiendo, se descarta por número de pedido.
