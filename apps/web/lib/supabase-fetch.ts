// fetch con limite de tiempo para las llamadas a Supabase.
//
// Sin esto, cuando la API de Supabase deja de responder (se han registrado
// miles de 522 de Cloudflare, que es un timeout de gateway y no una respuesta
// de error) la peticion se queda abierta hasta que la mata Vercel. Cada render
// afectado mantenia viva la funcion todo ese rato, y como el fetch fallido no
// interrumpe el render, la pagina seguia haciendo el resto del trabajo igual.
//
// Con un tope corto la consulta falla rapido, quien llama devuelve su valor de
// respaldo y la funcion termina.
export const SUPABASE_TIMEOUT_MS = 6000

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // AbortSignal.timeout no esta en todos los runtimes soportados por el
  // browserslist del proyecto, asi que hay respaldo con AbortController.
  if (typeof AbortSignal.timeout !== 'function') {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }
  const timeout = AbortSignal.timeout(SUPABASE_TIMEOUT_MS)
  // supabase-js pasa su propia senal cuando se usa .abortSignal(); ahi hay que
  // respetar las dos y no pisar la del llamante.
  const signal =
    init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, timeout])
      : init?.signal || timeout
  return fetch(input, { ...init, signal })
}

// Un fallo por tiempo agotado no se reintenta: si la API no contesta, repetir
// la misma consulta solo multiplica el tiempo que la funcion sigue viva.
export function isTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string })?.name || ''
  const message = String((error as { message?: string })?.message || '')
  return name === 'TimeoutError' || name === 'AbortError' || message.includes('aborted')
}
