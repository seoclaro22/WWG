import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { eventUrls, pingIndexNow } from '@/lib/indexnow'
import { normalizeZoneKey } from '@/lib/zones-client'

export const runtime = 'nodejs'

// Avisa a IndexNow de que un evento acaba de publicarse. Lo llama el panel de
// admin al guardar, justo donde ya se dispara la notificacion push.
//
// Va en el servidor y no en el cliente porque el envio lleva la clave del
// dominio: en el bundle del navegador cualquiera podria cogerla y enviar URLs
// en nombre del sitio.

function parseRoles(raw: unknown) {
  if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
  if (typeof raw === 'string') return raw.replace(/[{}]/g, '').split(',').filter(Boolean)
  return []
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const eventId = body?.eventId as string | undefined
  if (!eventId) return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 })

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return NextResponse.json({ ok: false, error: 'missing_auth' }, { status: 401 })

  const sb = getSupabaseServer()
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { data: roleRow } = await sb.from('users').select('roles').eq('id', authData.user.id).maybeSingle()
  const roles = parseRoles(roleRow?.roles)
  if (!roles.includes('admin') && !roles.includes('moderator')) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  // Solo se anuncia lo que un buscador puede ver: un borrador no esta publicado
  // y avisar de el seria mandar a rastrear un 404.
  const { data: event } = await sb
    .from('events_public')
    .select('id,status,zone')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  if (event.status !== 'published') {
    return NextResponse.json({ ok: false, error: 'not_published' }, { status: 400 })
  }

  const zoneSlug = event.zone ? normalizeZoneKey(String(event.zone)) : null
  const result = await pingIndexNow(eventUrls(eventId, zoneSlug))
  return NextResponse.json(result)
}
