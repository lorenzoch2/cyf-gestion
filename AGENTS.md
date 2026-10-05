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
src/
  lib/
    supabase.ts         # el cliente; null si faltan las variables
    sesion.tsx          # contexto de sesión (entrar / salir)
    datos.ts            # una función por consulta + el hook useConsulta
    tipos.ts            # filas de la base y etiquetas para mostrar
    formato.ts          # pesos, fechas, enlaces de teléfono y mapa
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
