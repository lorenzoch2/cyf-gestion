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
    formato.ts          # pesos, fechas, enlaces de teléfono y mapa
    pdf.ts              # el presupuesto en PDF, compuesto en el navegador
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
- **El color del estado de gestión es uno solo** y vive en `ESTADOS_PROSPECTO` (`tipos.ts`):
  el mismo en la lista, en la ficha y —cuando llegue— en el mapa.
- **Latón para la acción, acero para la estructura.** El botón de latón lleva texto grafito, nunca
  blanco: es la regla de contraste del manual de marca.

## Cuidados

- **Las variables de Vite se leen al compilar.** Cambiar `.env.local` exige reiniciar `npm run dev`;
  en Netlify, volver a desplegar.
- **El tarifario existe en dos lados**: la tabla `servicios` y el documento
  `04 Comercial/Tarifario/Tarifario de servicios 2026.md` en la carpeta de la empresa. El documento
  es el oficial; si cambia un precio, cambia en los dos.
- **La numeración de presupuestos** (`AAAA-NNN`) es la misma de la empresa. Antes de usar un número
  nuevo, revisar que no choque con `04 Comercial/Presupuestos/_Registro de presupuestos.md`.
- Los prospectos vienen de OpenStreetMap con licencia ODbL: si alguna vez se publican, hay que
  atribuir la fuente.
