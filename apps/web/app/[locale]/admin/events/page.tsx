"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import { UploadImage } from '@/components/UploadImage'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { GenreSelect } from '@/components/GenreSelect'

type Club = { id: string; name: string }
type Event = { id?: string; club_id?: string | null; name: string; description?: string | null; description_i18n?: Record<string, string> | null; start_at?: string; end_at?: string | null; url_referral?: string | null; status?: string; images?: any; genres?: string[] | null; zone?: string | null; contact_phone?: string | null; sponsored?: boolean | null }

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

export default function AdminEventsPage() {
  return (
    <AdminGuard>
      <EventsManager />
    </AdminGuard>
  )
}

// Orden del listado: primero los que estan por venir, del mas cercano al mas
// lejano, y debajo los ya pasados del mas reciente hacia atras.
//
// Ordenar por fecha a secas no vale: ascendente deja arriba el evento mas
// antiguo del historico y descendente el mas lejano en el futuro. En los dos
// casos lo que se viene a buscar (lo de esta semana) queda enterrado.
//
// Los eventos sin fecha van al final: no se pueden situar y no deben empujar
// hacia abajo a los que si tienen.
function sortByUpcoming(rows: Event[]): Event[] {
  const now = Date.now()
  const time = (e: Event) => {
    const t = e.start_at ? new Date(e.start_at).getTime() : NaN
    return Number.isNaN(t) ? null : t
  }
  return [...rows].sort((a, b) => {
    const ta = time(a)
    const tb = time(b)
    if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1
    const aUpcoming = ta >= now
    const bUpcoming = tb >= now
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
    return aUpcoming ? ta - tb : tb - ta
  })
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
    // events_admin y no events: contact_phone ya no es legible por columna
    // para el rol authenticated a secas (grant limitado en el esquema), asi que
    // hay que leerlo por la vista de moderador, que lo expone con sus propios
    // privilegios y filtra por is_moderator() por dentro.
    const { data } = await s
      .from('events_admin')
      .select('id,club_id,name,description,description_i18n,start_at,end_at,url_referral,status,genres,zone,contact_phone,images,sponsored')
      // Descendente en la consulta y no ascendente: con el limite de 500, pedir
      // ascendente se traeria los 500 mas antiguos y dejaria fuera los futuros,
      // que son justo los que interesan. El orden de pantalla se hace abajo.
      .order('start_at', { ascending: false })
      .ilike('name', `%${dq}%`)
      .limit(500)
    setItems(sortByUpcoming(data || []))
  }
  async function loadClubs() {
    const { data } = await sb().from('clubs').select('id,name').order('name')
    setClubs(data || [])
  }
  useEffect(() => { load(); loadClubs() }, [])
  useEffect(() => { load() }, [dq])

  async function save(ev: Event) {
    const s = sb()
    const shouldNotify =
      (!ev.id && (ev.status || 'published') === 'published') ||
      (editing?.id && editing?.status !== 'published' && ev.status === 'published')
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
    if (eventId) {
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
    setEditing(null)
    load()
  }

  async function remove(id?: string) {
    if (!id) return
    const ok = confirm('¿Eliminar este evento?')
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
        <button className="btn btn-primary" onClick={()=>setEditing({ name:'', status:'published', sponsored: false })}>Nuevo</button>
      </div>
      <input className="w-full bg-transparent border border-white/10 rounded-xl p-2" placeholder="Buscar evento..." value={q} onChange={e=>setQ(e.target.value)} />
      {/* Nuevo se abre arriba, fuera de la lista: no tiene fila propia donde
          desplegarse debajo. Editar si la tiene (ver dentro del map). */}
      {editing && !editing.id && (
        <EventForm key="new" initial={editing} clubs={clubs} onCancel={()=>setEditing(null)} onSave={save} onLineupChange={setLineup} />
      )}
      <div className="grid gap-2">
        {items.map(e => (
          <div key={e.id} className="grid gap-2">
            <div className="card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {e.name}
                  {e.sponsored ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#d6b24d] text-black">Patrocinado</span> : null}
                </div>
                <div className="text-sm text-white/60">{e.start_at?.toString()} · {e.status}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={()=>setEditing(editing?.id === e.id ? null : e)}>{editing?.id === e.id ? 'Cerrar' : 'Editar'}</button>
                <button className="btn btn-secondary" onClick={()=>remove(e.id)}>Eliminar</button>
              </div>
            </div>
            {/* Se despliega justo debajo de su fila: antes el formulario solo
                aparecia al final de la lista entera, y con 300+ eventos habia
                que bajar del todo cada vez para editar uno de arriba. */}
            {editing && editing.id === e.id && (
              <EventForm key={e.id} initial={editing} clubs={clubs} onCancel={()=>setEditing(null)} onSave={save} onLineupChange={setLineup} />
            )}
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
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
          <input value={(form as any).contact_phone || ''} onChange={e=>setForm({ ...form, contact_phone: e.target.value as any })} placeholder="Solo visible en backoffice" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
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
        <button className="btn btn-primary" onClick={()=>onSave({ ...form, sponsored: !!form.sponsored, images: image ? [image] : [] })}>Guardar</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}


