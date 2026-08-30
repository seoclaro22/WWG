"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useIsModerator } from '@/components/admin/useIsModerator'
import { AdminEvent, ClubOption, EventForm, saveEvent } from '@/components/admin/EventForm'
import { AdminClub, ClubForm, saveClub } from '@/components/admin/ClubForm'
import { AdminDJ, DJForm, saveDj } from '@/components/admin/DJForm'

type Kind = 'event' | 'club' | 'dj'

const TITLES: Record<Kind, string> = {
  event: 'Editar evento',
  club: 'Editar club',
  dj: 'Editar DJ',
}

// Boton de edicion rapida sobre la propia ficha publica.
//
// Editar algo implicaba ir al back office, buscarlo en una lista de cientos y
// desplegar su fila; desde aqui se abre el mismo formulario completo encima de
// la ficha que se esta mirando. Es el formulario del back office, no una
// version reducida: reutiliza EventForm / ClubForm / DJForm tal cual, asi que
// no hay ningun campo que solo se pueda tocar en un sitio.
//
// Solo se dibuja para moderadores, pero eso es cosmetico: quien manda es RLS.
export function QuickEdit({ kind, id }: { kind: Kind; id: string }) {
  const isModerator = useIsModerator()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<any>(null)
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El cuerpo no debe hacer scroll por detras del modal.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!isModerator) return null

  async function openEditor() {
    setOpen(true)
    setError(null)
    setRow(null)
    const s = supabaseBrowser
    if (kind === 'event') {
      // events_admin y no events: contact_phone solo es legible por la vista de
      // moderador. Ver el comentario de la carga en el back office.
      const [{ data, error: err }, clubsRes] = await Promise.all([
        s.from('events_admin')
          .select('id,club_id,name,description,description_i18n,start_at,end_at,url_referral,status,genres,zone,contact_phone,images,sponsored')
          .eq('id', id)
          .maybeSingle(),
        s.from('clubs').select('id,name').order('name'),
      ])
      setClubs(clubsRes.data || [])
      if (err || !data) { setError('No se pudo cargar el evento.'); return }
      setRow(data)
      return
    }
    const table = kind === 'club' ? 'clubs' : 'djs'
    const columns = kind === 'club'
      ? '*'
      : 'id,name,short_bio,bio,spotify_embed,genres,images,short_bio_i18n,bio_i18n'
    const { data, error: err } = await s.from(table).select(columns).eq('id', id).maybeSingle()
    if (err || !data) { setError(`No se pudo cargar ${kind === 'club' ? 'el club' : 'el DJ'}.`); return }
    setRow(data)
  }

  async function handleSave(payload: any, lineup?: string[]) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const message = kind === 'event'
        ? await saveEvent(payload as AdminEvent, lineup || [], row?.status)
        : kind === 'club'
          ? await saveClub(payload as AdminClub)
          : await saveDj(payload as AdminDJ)
      if (message) { setError(message); return }
      setOpen(false)
      // La ficha es un server component cacheado: sin refresh se seguiria
      // viendo el contenido viejo hasta que caduque el revalidate.
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[#d8af3a] text-black font-semibold text-sm px-4 py-3 shadow-lg shadow-black/40 hover:brightness-110 transition"
      >
        Editar ficha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl my-8 rounded-2xl border border-white/10 bg-[#0b0a0f] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{TITLES[kind]}</h2>
              <button type="button" onClick={()=>setOpen(false)} className="text-white/50 hover:text-white text-xl leading-none px-2" aria-label="Cerrar">×</button>
            </div>
            <div className="p-4">
              {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
              {!row && !error && <div className="muted py-8 text-center">Cargando...</div>}
              {row && kind === 'event' && (
                <EventForm initial={row} clubs={clubs} saving={saving} onCancel={()=>setOpen(false)} onSave={handleSave} />
              )}
              {row && kind === 'club' && (
                <ClubForm initial={row} saving={saving} onCancel={()=>setOpen(false)} onSave={handleSave} />
              )}
              {row && kind === 'dj' && (
                <DJForm initial={row} saving={saving} onCancel={()=>setOpen(false)} onSave={handleSave} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
