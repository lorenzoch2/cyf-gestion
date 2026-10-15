import { useState } from 'react'

/*
  Lo que se escribió y todavía no se guardó.

  En la calle un formulario se interrumpe solo: entra una llamada, se cierra la
  hoja sin querer, el teléfono se bloquea. Perder lo tipeado es poco y es mucho
  a la vez — poco trabajo, pero la segunda vez uno ya no lo vuelve a escribir y
  el dato se pierde para siempre.

  El borrador vive en el teléfono, no en la base: todavía no es un registro, es
  una intención. Se borra solo cuando el registro se confirma de verdad.
*/

const PREFIJO = 'borrador:'

function leer<T>(clave: string, inicial: T): T {
  try {
    const guardado = localStorage.getItem(PREFIJO + clave)
    return guardado ? { ...inicial, ...(JSON.parse(guardado) as object) } : inicial
  } catch {
    // Ventana privada o almacenamiento bloqueado: se sigue sin borrador.
    return inicial
  }
}

/**
 * Un formulario que se acuerda de lo escrito.
 *
 * Devuelve el valor, una función para cambiar campos sueltos y otra para
 * olvidarlo. Olvidar es parte del contrato: si el borrador no se limpia al
 * guardar, el formulario siguiente aparece con los datos del anterior.
 */
export function useBorrador<T extends object>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, inicial))

  function fijar(cambios: Partial<T>) {
    setValor(previo => {
      const nuevo = { ...previo, ...cambios }
      try {
        localStorage.setItem(PREFIJO + clave, JSON.stringify(nuevo))
      } catch {
        // Si no se puede guardar, el formulario sigue funcionando igual.
      }
      return nuevo
    })
  }

  function olvidar() {
    try {
      localStorage.removeItem(PREFIJO + clave)
    } catch {
      // Nada que hacer: el valor en memoria se reinicia igual.
    }
    setValor(inicial)
  }

  /** Si había algo escrito de antes, conviene decírselo a quien abre la hoja. */
  const recuperado = Object.entries(valor).some(
    ([campo, v]) => v !== (inicial as Record<string, unknown>)[campo],
  )

  return { valor, fijar, olvidar, recuperado }
}
