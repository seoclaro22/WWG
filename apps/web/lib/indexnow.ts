// IndexNow: avisa a Bing, Yandex, Seznam y Naver de que una URL es nueva o ha
// cambiado, en vez de esperar a que pasen a rastrear. En una agenda cuyo
// contenido caduca en dias, esperar al rastreo natural significa que medio
// inventario nunca llega a indexarse a tiempo.
//
// Google no participa en IndexNow, asi que esto no le afecta.
//
// La clave debe estar publicada en https://wherewego.site/<clave>.txt con la
// propia clave dentro: asi el buscador comprueba que quien envia es el dueno
// del dominio. Ese fichero es public/1c5a680bd14c67e93043da4ebf35dd54.txt.
//
// Si algun dia se cambia la clave hay que renombrar tambien ese fichero y
// poner dentro el nuevo valor, o los envios empezaran a rechazarse.
export const INDEXNOW_KEY = '1c5a680bd14c67e93043da4ebf35dd54'

const HOST = 'wherewego.site'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

// El envio no debe romper nunca la operacion que lo dispara: si el alta de un
// evento funciona pero el ping falla, el evento sigue publicado y el rastreo
// natural acaba llegando igual. Por eso todo error se traga y se registra.
export async function pingIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  const urlList = Array.from(new Set(urls.filter(Boolean))).slice(0, 10000)
  if (urlList.length === 0) return { ok: true }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList }),
    })
    if (!res.ok) console.error('indexnow ping failed', res.status, await res.text().catch(() => ''))
    return { ok: res.ok, status: res.status }
  } catch (err) {
    console.error('indexnow ping error', err)
    return { ok: false }
  }
}

// Las URLs que hay que refrescar cuando cambia un evento: su ficha en los tres
// idiomas mas los listados de los que cuelga, que acaban de cambiar tambien.
export function eventUrls(eventId: string, zoneSlug?: string | null) {
  const out = [
    `https://${HOST}/event/${eventId}`,
    `https://${HOST}/en/event/${eventId}`,
    `https://${HOST}/de/event/${eventId}`,
  ]
  if (zoneSlug) {
    out.push(`https://${HOST}/${zoneSlug}`, `https://${HOST}/en/${zoneSlug}`, `https://${HOST}/de/${zoneSlug}`)
  }
  return out
}
