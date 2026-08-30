"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { AdminEvent, ClubOption, EventForm, saveEvent } from '@/components/admin/EventForm'

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
function sortByUpcoming(rows: AdminEvent[]): AdminEvent[] {
  const now = Date.now()
  const time = (e: AdminEvent) => {
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
  const [items, setItems] = useState<AdminEvent[]>([])
  const [clubs, setClubs] = useState<ClubOption[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AdminEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const dq = useDebounce(q, 300)

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

  async function save(ev: AdminEvent, lineup: string[]) {
    if (saving) return
    setSaving(true)
    try {
      const error = await saveEvent(ev, lineup, editing?.status)
      if (error) { alert(error); return }
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
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
        <EventForm key="new" initial={editing} clubs={clubs} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />
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
              <EventForm key={e.id} initial={editing} clubs={clubs} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />
            )}
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
    </div>
  )
}
