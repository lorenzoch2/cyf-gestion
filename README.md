# CyF Gestión

Aplicación interna de **Calor y Frío Industrial SpA**: prospectos, clientes, negocios, pendientes,
tarifario y presupuestos. Pensada para el teléfono, en la calle, con una mano.

No es el sitio público — ese vive en
[`caloryfrioindustrial`](https://github.com/lorenzoch2/caloryfrioindustrial).

## Qué hace

| Sección | Para qué |
|---|---|
| **Hoy** | Lo que hay que hacer: pendientes, seguimientos con fecha y negocios esperando respuesta |
| **Prospectos** | Los locales de la campaña, filtrados por zona y estado. Llamar, WhatsApp, mapa y registrar la visita |
| **Clientes** | Ficha con equipos, contratos de mantención e historial de visitas |
| **Negocios** | Qué se está cotizando y en qué etapa va, con el monto en juego |
| **Rutas** | Los locales que se caminan en una tarde, con cuántos faltan por visitar |
| **Pendientes** | Tareas con fecha de vencimiento |
| **Tarifario** | Precios por equipo, netos y con IVA. Uno general y los que se quieran por zona o por cliente |
| **Presupuestos** | Armar una cotización desde el tarifario y mandarla en PDF con la marca, o como texto por WhatsApp |

## Montar el proyecto

```bash
npm install
cp .env.example .env.local   # y pegar los dos datos de Supabase
npm run dev
```

### Base de datos

En el panel de Supabase, **SQL Editor**, ejecutar en este orden:

1. `supabase/schema.sql` — tablas, índices y permisos
2. `supabase/seed-servicios.sql` — el tarifario
3. `supabase/seed-prospectos.sql` — los 333 locales de la campaña
4. `supabase/migracion-02-flexibilidad.sql` — estados de gestión, rutas y tarifarios múltiples

Las cuentas se crean a mano en **Authentication → Users**. No hay registro abierto: son dos
personas y cada una entra con su correo.

### Publicar

Netlify toma `netlify.toml` tal cual. Las dos variables de entorno
(`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`) se cargan en
**Site configuration → Environment variables**, porque Vite las necesita en tiempo de compilación.

## Cómo está armado

- **Vite + React + TypeScript**, sin servidor propio: el navegador habla directo con Supabase.
- **Tailwind 4** con la paleta de la marca declarada en `src/estilos.css`.
- **React Router** en modo SPA; `netlify.toml` redirige todo a `index.html`.
- Los datos viven en `src/lib/datos.ts`: una función por consulta, sin caché. La app la usan dos
  personas en un teléfono y una consulta directa es más fácil de seguir que un caché que invalidar.
- La seguridad está en la base, no en la app: las políticas RLS de `supabase/schema.sql` exigen
  sesión iniciada para leer o escribir cualquier tabla.
