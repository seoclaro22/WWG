import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SOURCE_RE = /^[a-z0-9_-]{1,40}$/i

// Dominios a los que se permite saltar. Son las plataformas de venta de
// entradas con las que se trabaja, mas las redes donde los clubs publican sus
// eventos.
//
// Sin esta lista, quien pueda escribir url_referral (backoffice, o una politica
// RLS demasiado abierta) convierte wherewego.site en un redirector con la
// reputacion de nuestro dominio, que es justo lo que se busca para phishing.
const ALLOWED_HOSTS = [
  'fourvenues.com',
  'xceed.me',
  'dice.fm',
  'eventbrite.com',
  'eventbrite.es',
  'wegow.com',
  'entradas.com',
  'ticketmaster.es',
  'ticketmaster.com',
  'shotgun.live',
  'resident-advisor.net',
  'ra.co',
  'instagram.com',
  'facebook.com',
  'whatsapp.com',
  'wa.me',
]

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^www\./, '')
  // Se aceptan subdominios (tickets.xceed.me) pero comparando por etiqueta
  // completa: "malicioso-xceed.me" no cuela, "xceed.me.atacante.com" tampoco.
  return ALLOWED_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`))
}

export async function GET(req: NextRequest) {
  // 20/min por IP: un visitante real no pulsa reservar 20 veces en un minuto,
  // pero es holgado para no molestar a quien reintenta o comparte red (NAT).
  if (!rateLimit(`out:${clientIp(req)}`, 20)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  const url = new URL(req.url)
  const eventId = url.searchParams.get('event')
  const rawSource = url.searchParams.get('source') || 'discover'
  const source = SOURCE_RE.test(rawSource) ? rawSource : 'discover'
  if (!eventId || !UUID_RE.test(eventId)) {
    return NextResponse.json({ error: 'missing event' }, { status: 400 })
  }

  const sb = getSupabaseClient()

  const { data: ev, error } = await sb
    .from('events_public')
    .select('id,url_referral')
    .eq('id', eventId)
    .maybeSingle()
  if (error || !ev) return NextResponse.redirect(new URL('/', req.url), { status: 302 })

  const rawReferral = (ev.url_referral || '').toString().trim()
  let referral = rawReferral || '/'
  if (referral.startsWith('//')) referral = `https:${referral}`
  if (!/^https?:\/\//i.test(referral) && !referral.startsWith('/')) {
    referral = `https://${referral}`
  }

  // Destino interno: siempre permitido. Destino externo: solo si el host esta
  // en la lista; si no, se manda a la ficha del evento en vez de fuera.
  let dest: URL
  if (referral.startsWith('/')) {
    dest = new URL(referral, req.url)
  } else {
    let parsed: URL | null = null
    try { parsed = new URL(referral) } catch {}
    if (parsed && /^https?:$/.test(parsed.protocol) && isAllowedHost(parsed.hostname)) {
      dest = parsed
    } else {
      console.warn('out: destino no permitido', { eventId, host: parsed?.hostname })
      dest = new URL(`/event/${eventId}`, req.url)
    }
  }

  // Aqui ya no se registra el clic. Lo hace ReserveButton antes de navegar, con
  // el user_id de la sesion y validado por la politica clicks_insert_self.
  //
  // Esta ruta lo insertaba tambien, con el user_id que viniera en ?u=. Eso
  // contaba cada reserva dos veces y, peor, dejaba a cualquiera inflar la tabla
  // en bucle o atribuirse clics ajenos, que es de donde salen las metricas de
  // afiliacion. Como se llega por navegacion del navegador, aqui no hay forma
  // de mandar cabecera de autorizacion, asi que no se puede saber quien llama:
  // registrar sin identidad fiable era peor que no registrar.
  return NextResponse.redirect(dest, { status: 302 })
}
