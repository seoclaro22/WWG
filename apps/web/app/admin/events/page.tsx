"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { UploadImage } from '@/components/UploadImage'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { GenreSelect } from '@/components/GenreSelect'

type Club = { id: string; name: string }
type Event = { id?: string; club_id?: string | null; name: string; description?: string | null; description_i18n?: Record<string, string> | null; start_at?: string; end_at?: string | null; url_referral?: string | null; status?: string; images?: any; genres?: string[] | null; zone?: string | null; contact_phone?: string | null }

function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }) }

export default function AdminEventsPage() {
  return (
    <AdminGuard>
      <EventsManager />
    </AdminGuard>
  )
}

function EventsManager() {
  const [items, setItems] = useState<Event[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Event | null>(null)
  const dq = useDebounce(q, 300)
  const [lineup, setLineup] = useState<string[]>([])

  async function load() {
    const s = sb()
    const { data } = await s
      .from('events')
      .select('id,club_id,name,description,description_i18n,start_at,end_at,url_referral,status,genres,zone,contact_phone,images')
      .order('start_at', { ascending: false })
      .ilike('name', `%${dq}%`)
      .limit(100)
    setItems(data || [])
  }
  async function loadClubs() {
    const { data } = await sb().from('clubs').select('id,name').order('name')
    setClubs(data || [])
  }
  useEffect(() => { load(); loadClubs() }, [])
  useEffect(() => { load() }, [dq])

  async function save(ev: Event) {
    const s = sb()
    let eventId = ev.id
    if (ev.id) {
      const { error } = await s.from('events').update(ev).eq('id', ev.id)
      if (error) { alert('No se pudo guardar el evento: ' + error.message); return }
    } else {
      const { data, error } = await s.from('events').insert({ ...ev, status: ev.status || 'published' }).select('id').single()
      if (!error) eventId = data?.id
      else { alert('No se pudo crear el evento: ' + error.message); return }
    }
    if (eventId) {
      await s.from('event_djs').delete().eq('event_id', eventId)
      if (lineup.length) {
        const rows = lineup.map((dj_id, idx) => ({ event_id: eventId, dj_id, position: idx }))
        const { error } = await s.from('event_djs').insert(rows)
        if (error) { alert('No se pudo guardar el line-up: ' + error.message) }
      }
    }
    setEditing(null)
    load()
  }

  async function remove(id?: string) {
    if (!id) return
    const ok = confirm('Â¿Eliminar este evento?')
    if (!ok) return
    const client = sb()
    const { error } = await client.from('events').delete().eq('id', id)
    if (error) { alert('No se pudo eliminar: ' + error.message); return }
    try { await client.from('events_public').delete().eq('id', id) } catch {}
    try { await client.from('event_djs').delete().eq('event_id', id) } catch {}
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn btn-secondary"><span aria-hidden="true">{'<'}</span> Volver</Link>
          <h1 className="text-2xl font-semibold">Eventos</h1>
        </div>
        <button className="btn btn-primary" onClick={()=>setEditing({ name:'', status:'published' })}>Nuevo</button>
      </div>
      <input className="w-full bg-transparent border border-white/10 rounded-xl p-2" placeholder="Buscar evento..." value={q} onChange={e=>setQ(e.target.value)} />
      <div className="grid gap-2">
        {items.map(e => (
          <div key={e.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-sm text-white/60">{e.start_at?.toString()} Â· {e.status}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={()=>setEditing(e)}>Editar</button>
              <button className="btn btn-secondary" onClick={()=>remove(e.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
      {editing && <EventForm key={editing.id || 'new'} initial={editing} clubs={clubs} onCancel={()=>setEditing(null)} onSave={save} onLineupChange={setLineup} />}
    </div>
  )
}

function EventForm({ initial, clubs, onCancel, onSave, onLineupChange }: { initial: Event; clubs: Club[]; onCancel: () => void; onSave: (e: Event) => void; onLineupChange: (ids: string[]) => void }) {
  const [form, setForm] = useState<Event>(initial)
  const [djs, setDjs] = useState<Club[]>([] as any)
  const cover = Array.isArray(initial.images) && initial.images.length ? initial.images[0] : null
  const [image, setImage] = useState<string | null>(cover)
  useEffect(() => { sb().from('djs').select('id,name').order('name').then(({data})=>setDjs(data||[])) }, [])
  const [selected, setSelected] = useState<string[]>([])
  // Sync when initial changes (editar vs nuevo)
  useEffect(() => {
    setForm(initial)
    const id = (initial as any).id
    if (id) {
      sb().from('event_djs').select('dj_id').eq('event_id', id).order('position', { ascending: true }).then(({ data }) => setSelected((data||[]).map(r=>r.dj_id)))
    } else {
      setSelected([])
    }
  }, [initial])
  useEffect(() => { onLineupChange(selected) }, [selected])
  return (
    <div className="card p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm">Nombre</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Zona</label>
          <input value={form.zone || ''} onChange={e=>setForm({ ...form, zone: e.target.value })} placeholder="Mallorca / Ibiza / Barcelona / Madrid" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Club</label>
          <select value={form.club_id || ''} onChange={e=>setForm({ ...form, club_id: e.target.value || null })} className="w-full bg-transparent border border-white/10 rounded-xl p-2">
            <option value="">â€”</option>
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
          <input value={(form as any).contact_phone || ''} onChange={e=>setForm({ ...form, contact_phone: e.target.value as any })} placeholder="Solo visible en backoffice" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">DescripciÃ³n</label>
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
            {djs.map((dj:any) => (
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
        <button className="btn btn-primary" onClick={()=>onSave({ ...form, images: image ? [image] : [] })}>Guardar</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}


