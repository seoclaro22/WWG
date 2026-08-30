"use client"
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { UploadImage } from '@/components/UploadImage'
import { GenreSelect } from '@/components/GenreSelect'

export type AdminEvent = {
  id?: string
  club_id?: string | null
  name: string
  description?: string | null
  description_i18n?: Record<string, string> | null
  start_at?: string
  end_at?: string | null
  url_referral?: string | null
  status?: string
  images?: any
  genres?: string[] | null
  zone?: string | null
  contact_phone?: string | null
  sponsored?: boolean | null
}

export type ClubOption = { id: string; name: string }

// Guardado de evento, compartido por el back office y la edicion rapida desde
// la ficha publica. Incluye el line-up y los avisos posteriores porque los tres
// van juntos: guardar el evento sin reescribir event_djs deja el cartel viejo.
//
// Devuelve el mensaje de error, o null si fue bien.
export async function saveEvent(
  ev: AdminEvent,
  lineup: string[],
  previousStatus?: string,
): Promise<string | null> {
  const s = supabaseBrowser
  const shouldNotify =
    (!ev.id && (ev.status || 'published') === 'published') ||
    (!!ev.id && previousStatus !== 'published' && ev.status === 'published')

  let eventId = ev.id
  if (ev.id) {
    const { error } = await s.from('events').update(ev).eq('id', ev.id)
    if (error) return 'No se pudo guardar el evento: ' + error.message
  } else {
    const { data, error } = await s.from('events').insert({ ...ev, status: ev.status || 'published' }).select('id').single()
    if (error) return 'No se pudo crear el evento: ' + error.message
    eventId = data?.id
  }

  if (eventId) {
    await s.from('event_djs').delete().eq('event_id', eventId)
    if (lineup.length) {
      const rows = lineup.map((dj_id, idx) => ({ event_id: eventId, dj_id, position: idx }))
      const { error } = await s.from('event_djs').insert(rows)
      if (error) return 'No se pudo guardar el line-up: ' + error.message
    }

    try {
      const { data } = await s.auth.getSession()
      const token = data.session?.access_token
      if (token) {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        const payload = JSON.stringify({ eventId })
        // La push solo al publicar por primera vez; el aviso a los buscadores
        // en cada guardado, porque tambien cambia la ficha al editarla.
        if (shouldNotify) {
          await fetch('/api/notify-event', { method: 'POST', headers, body: payload })
        }
        await fetch('/api/indexnow', { method: 'POST', headers, body: payload })
      }
    } catch {}
  }
  return null
}

export function EventForm({ initial, clubs, onCancel, onSave, saving }: {
  initial: AdminEvent
  clubs: ClubOption[]
  onCancel: () => void
  onSave: (e: AdminEvent, lineup: string[]) => void
  saving?: boolean
}) {
  const [form, setForm] = useState<AdminEvent>(initial)
  const [djs, setDjs] = useState<ClubOption[]>([])
  const cover = Array.isArray(initial.images) && initial.images.length ? initial.images[0] : null
  const [image, setImage] = useState<string | null>(cover)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => { supabaseBrowser.from('djs').select('id,name').order('name').then(({ data }) => setDjs(data || [])) }, [])

  // Sync when initial changes (editar vs nuevo)
  useEffect(() => {
    setForm(initial)
    if (initial.id) {
      supabaseBrowser
        .from('event_djs')
        .select('dj_id')
        .eq('event_id', initial.id)
        .order('position', { ascending: true })
        .then(({ data }) => setSelected((data || []).map(r => r.dj_id)))
    } else {
      setSelected([])
    }
  }, [initial])

  return (
    <div className="card p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm">Nombre</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Zona</label>
          {/* Ejemplos de zonas que existen de verdad. Antes ponia Ibiza,
              Barcelona y Madrid, donde no hay agenda, y omitia Valencia, que es
              la que mas eventos tiene. Sigue siendo texto libre: es asi como se
              da de alta una ciudad nueva. */}
          <input value={form.zone || ''} onChange={e=>setForm({ ...form, zone: e.target.value })} placeholder="Mallorca / Valencia / Castellón / Amsterdam" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Club</label>
          <select value={form.club_id || ''} onChange={e=>setForm({ ...form, club_id: e.target.value || null })} className="w-full bg-transparent border border-white/10 rounded-xl p-2 wwg-select">
            <option value="">—</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Estado</label>
          <select value={form.status || 'published'} onChange={e=>setForm({ ...form, status: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2">
            <option value="published">published</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Patrocinado</label>
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={!!form.sponsored}
              onChange={e=>setForm({ ...form, sponsored: e.target.checked })}
            />
            Evento patrocinado
          </label>
        </div>
        <div>
          <label className="block text-sm">Inicio</label>
          <input type="datetime-local" value={form.start_at || ''} onChange={e=>setForm({ ...form, start_at: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Fin</label>
          <input type="datetime-local" value={form.end_at || ''} onChange={e=>setForm({ ...form, end_at: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">URL de referido (venta de entradas)</label>
          <input value={form.url_referral || ''} onChange={e=>setForm({ ...form, url_referral: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Telefono (privado)</label>
          <input value={form.contact_phone || ''} onChange={e=>setForm({ ...form, contact_phone: e.target.value })} placeholder="Solo visible en backoffice" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Descripción</label>
          <textarea value={form.description || ''} onChange={e=>setForm({ ...form, description: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={3} />
        </div>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Descripcion (EN)</label>
            <textarea
              value={(form.description_i18n?.en) || ''}
              onChange={e=>setForm({ ...form, description_i18n: { ...(form.description_i18n || {}), en: e.target.value } })}
              className="w-full bg-transparent border border-white/10 rounded-xl p-2"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm">Descripcion (DE)</label>
            <textarea
              value={(form.description_i18n?.de) || ''}
              onChange={e=>setForm({ ...form, description_i18n: { ...(form.description_i18n || {}), de: e.target.value } })}
              className="w-full bg-transparent border border-white/10 rounded-xl p-2"
              rows={3}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Géneros</label>
          <GenreSelect value={form.genres || []} onChange={(vals)=>setForm({ ...form, genres: vals })} allowCreate />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Imagen (portada)</label>
          <UploadImage value={image || undefined} onChange={setImage} folder="events" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Line-up (DJs)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-auto p-2 border border-white/10 rounded-xl">
            {djs.map((dj) => (
              <label key={dj.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(dj.id)} onChange={e=>{
                  if (e.target.checked) setSelected([...selected, dj.id]); else setSelected(selected.filter(x=>x!==dj.id))
                }} />
                <span>{dj.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          type="button"
          disabled={saving}
          onClick={()=>onSave({ ...form, sponsored: !!form.sponsored, images: image ? [image] : [] }, selected)}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>
    </div>
  )
}
