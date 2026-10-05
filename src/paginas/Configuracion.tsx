/** Lo que se ve si faltan las variables de Supabase: qué hacer, en orden. */
export function Configuracion() {
  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-laton-dk">
        Calor y Frío Industrial
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Falta conectar la base</h1>
      <p className="mt-3 text-mut">
        La app no encuentra las claves de Supabase. Son dos datos y están en el panel del proyecto,
        en <span className="font-medium text-grafito">Project Settings → API</span>.
      </p>

      <ol className="mt-6 space-y-4 text-sm">
        <li className="rounded-xl border border-linea bg-white p-4">
          <p className="font-semibold">1. Crear el archivo</p>
          <p className="mt-1 text-mut">
            En la raíz del proyecto, copiar <code className="font-mono">.env.example</code> como{' '}
            <code className="font-mono">.env.local</code>.
          </p>
        </li>
        <li className="rounded-xl border border-linea bg-white p-4">
          <p className="font-semibold">2. Pegar los dos valores</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-tinte p-3 font-mono text-xs">
VITE_SUPABASE_URL=https://xxxxx.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=eyJhbGci…
          </pre>
        </li>
        <li className="rounded-xl border border-linea bg-white p-4">
          <p className="font-semibold">3. Reiniciar el servidor</p>
          <p className="mt-1 text-mut">
            Vite lee las variables al arrancar: hay que detenerlo y volver a correr{' '}
            <code className="font-mono">npm run dev</code>.
          </p>
        </li>
        <li className="rounded-xl border border-linea bg-white p-4">
          <p className="font-semibold">4. En Netlify</p>
          <p className="mt-1 text-mut">
            Las mismas dos variables van en{' '}
            <span className="text-grafito">Site configuration → Environment variables</span>.
          </p>
        </li>
      </ol>
    </div>
  )
}
