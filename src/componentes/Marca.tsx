/*
  La celosía: las aspas inclinadas de un difusor, dos de latón y dos de acero,
  recortadas en círculo. Es el símbolo de la marca, adoptado en agosto de 2026.

  Va en línea y no como archivo: son cuatro rectángulos y un recorte, pesa menos
  que la petición que haría falta para traerlo, y se ve nítido en cualquier
  tamaño sin cargar una imagen por cada densidad de pantalla.

  El ángulo (-27°) y los colores son los del manual. No se cambian acá: si
  alguna vez cambian, cambian en los vectores de la carpeta de la empresa y
  después aquí.
*/
export function Marca({ tamano = 28 }: { tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Calor y Frío Industrial"
      className="shrink-0"
    >
      <defs>
        <clipPath id="celosia">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>
      <g clipPath="url(#celosia)" transform="rotate(-27 100 100)">
        <rect x="2" y="-60" width="42" height="320" fill="#A9803F" />
        <rect x="57" y="-60" width="42" height="320" fill="#A9803F" />
        <rect x="112" y="-60" width="42" height="320" fill="#4F73A8" />
        <rect x="167" y="-60" width="42" height="320" fill="#4F73A8" />
      </g>
    </svg>
  )
}
