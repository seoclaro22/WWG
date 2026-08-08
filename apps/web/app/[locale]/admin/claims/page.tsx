"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

type Estado = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'more_information_required'

type Claim = {
  id: string
  target_type: 'dj' | 'club'
  target_id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string | null
  instagram: string
  website: string | null
  relationship: string
  reason: string | null
  extra_info: string | null
  status: Estado
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

const ESTADOS: { key: Estado | 'todas'; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'reviewing', label: 'En revision' },
  { key: 'more_information_required', label: 'Falta info' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'todas', label: 'Todas' },
]

// El estado se lee por la forma de la pastilla ademas de por el color: quien no
// distinga los tonos sigue viendo el texto, que es el que manda.
const COLOR_ESTADO: Record<Estado, string> = {
  pending: 'border-white/20 text-white/80 bg-white/5',
  reviewing: 'border-[#3987e5]/40 text-[#3987e5] bg-[#3987e5]/10',
  more_information_required: 'border-[#fab219]/40 text-[#fab219] bg-[#fab219]/10',
  approved: 'border-[#199e70]/40 text-[#199e70] bg-[#199e70]/10',
  rejected: 'border-[#d03b3b]/40 text-[#d03b3b] bg-[#d03b3b]/10',
}

const TEXTO_ESTADO: Record<Estado, string> = {
  pending: 'Pendiente',
  reviewing: 'En revision',
  more_information_required: 'Falta informacion',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

export default function AdminClaimsPage() {
  return (
    <AdminGuard>
      <ClaimsManager />
    </AdminGuard>
  )
}

function ClaimsManager() {
  const [items, setItems] = useState<Claim[]>([])
  const [filtro, setFiltro] = useState<Estado | 'todas'>('pending')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nombres, setNombres] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    let q = sb().from('profile_claims').select('*').order('created_at', { ascending: false })
    if (filtro !== 'todas') q = q.eq('status', filtro)
    const { data, error: err } = await q
    if (err) { setError(err.message); return }
    const filas = (data || []) as Claim[]
    setItems(filas)
    setError(null)

    // El nombre del perfil no vive en la solicitud: se resuelve aparte para no
    // duplicar el dato y que siempre refleje el nombre actual de la ficha.
    const djIds = filas.filter(f => f.target_type === 'dj').map(f => f.target_id)
    const clubIds = filas.filter(f => f.target_type === 'club').map(f => f.target_id)
    const mapa: Record<string, string> = {}
    if (djIds.length) {
      const { data: djs } = await sb().from('djs').select('id,name').in('id', djIds)
      for (const d of djs || []) mapa[d.id] = d.name
    }
    if (clubIds.length) {
      const { data: clubs } = await sb().from('clubs').select('id,name').in('id', clubIds)
      for (const c of clubs || []) mapa[c.id] = c.name
    }
    setNombres(mapa)
  }, [filtro])

  useEffect(() => { load() }, [load])

  // Cambiar a 'en revision' o pedir informacion son updates normales.
  async function cambiarEstado(id: string, status: Estado, notas?: string) {
    setOcupado(id)
    setError(null)
    const patch: Record<string, unknown> = { status }
    if (notas !== undefined) patch.admin_notes = notas
    const { error: err } = await sb().from('profile_claims').update(patch).eq('id', id)
    if (err) setError(err.message)
    await load()
    setOcupado(null)
  }

  // Aprobar NO: arrastra vincular la ficha, dar el rol y cerrar las demas
  // solicitudes, asi que va por la funcion que hace las cuatro cosas juntas.
  async function aprobar(id: string) {
    setOcupado(id)
    setError(null)
    const { error: err } = await sb().rpc('approve_profile_claim', { p_claim_id: id })
    if (err) setError(err.message)
    await load()
    setOcupado(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Solicitudes de verificacion</h1>
        <Link href="/admin" className="text-sm text-white/50 hover:text-white">Volver</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filtro === key
                ? 'bg-[#d8af3a] text-black font-semibold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {items.length === 0 && (
        <p className="text-sm text-white/50 py-8 text-center">
          No hay solicitudes en este estado.
        </p>
      )}

      <div className="space-y-2">
        {items.map((c) => {
          const nombre = nombres[c.target_id] || '(ficha no encontrada)'
          const url = c.target_type === 'dj' ? `/dj/${c.target_id}` : `/club/${c.target_id}`
          const expandida = abierta === c.id
          return (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="p-4 flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                      {c.target_type}
                    </span>
                    <a href={url} target="_blank" rel="noreferrer" className="font-medium text-white hover:text-[#d8af3a]">
                      {nombre}
                    </a>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${COLOR_ESTADO[c.status]}`}>
                      {TEXTO_ESTADO[c.status]}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mt-1">
                    {c.full_name} · {c.email}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(c.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={() => setAbierta(expandida ? null : c.id)}
                  className="text-sm text-white/50 hover:text-white underline underline-offset-2"
                >
                  {expandida ? 'Cerrar' : 'Ver solicitud'}
                </button>
              </div>

              {expandida && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  <Dato label="Instagram" valor={c.instagram} enlace={instagramUrl(c.instagram)} />
                  <Dato label="Relacion con el perfil" valor={c.relationship} />
                  {c.phone && <Dato label="Telefono" valor={c.phone} />}
                  {c.website && <Dato label="Web" valor={c.website} enlace={c.website} />}
                  {c.reason && <Dato label="Motivo" valor={c.reason} />}
                  {c.extra_info && <Dato label="Informacion adicional" valor={c.extra_info} />}
                  {c.admin_notes && <Dato label="Notas internas" valor={c.admin_notes} />}

                  {c.status !== 'approved' && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      <button
                        disabled={ocupado === c.id}
                        onClick={() => aprobar(c.id)}
                        className="px-4 py-2 rounded-full bg-[#199e70] text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        disabled={ocupado === c.id}
                        onClick={() => cambiarEstado(c.id, 'reviewing')}
                        className="px-4 py-2 rounded-full border border-white/15 text-white/80 text-sm disabled:opacity-50"
                      >
                        Marcar en revision
                      </button>
                      <button
                        disabled={ocupado === c.id}
                        onClick={() => {
                          const notas = prompt('Que informacion falta?')
                          if (notas != null) cambiarEstado(c.id, 'more_information_required', notas)
                        }}
                        className="px-4 py-2 rounded-full border border-white/15 text-white/80 text-sm disabled:opacity-50"
                      >
                        Pedir informacion
                      </button>
                      <button
                        disabled={ocupado === c.id}
                        onClick={() => {
                          const notas = prompt('Motivo del rechazo (opcional)') || undefined
                          cambiarEstado(c.id, 'rejected', notas)
                        }}
                        className="px-4 py-2 rounded-full border border-[#d03b3b]/40 text-[#d03b3b] text-sm disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dato({ label, valor, enlace }: { label: string; valor: string; enlace?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-white/35 font-semibold">{label}</p>
      {enlace ? (
        <a href={enlace} target="_blank" rel="noreferrer" className="text-sm text-[#d8af3a] hover:underline break-words">
          {valor}
        </a>
      ) : (
        <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{valor}</p>
      )}
    </div>
  )
}

// El Instagram llega como '@cuenta' o como URL completa segun lo escriba cada
// uno. Se normaliza para que el enlace de comprobacion funcione siempre: es el
// paso principal de la verificacion, no puede depender del formato.
function instagramUrl(raw: string) {
  const v = (raw || '').trim()
  if (!v) return undefined
  if (/^https?:\/\//i.test(v)) return v
  return `https://instagram.com/${v.replace(/^@/, '')}`
}
