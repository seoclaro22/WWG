"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { AdminClub, ClubForm, saveClub } from '@/components/admin/ClubForm'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() {
  return supabaseBrowser
}

export default function AdminClubsPage() {
  return (
    <AdminGuard>
      <ClubsManager />
    </AdminGuard>
  )
}

function ClubsManager() {
  const [items, setItems] = useState<AdminClub[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AdminClub | null>(null)
  const [saving, setSaving] = useState(false)
  const dq = useDebounce(q, 300)

  async function load() {
    const s = sb()
    // select('*') para tolerar esquemas sin columnas nuevas (logo_url, etc.)
    let query = s.from('clubs').select('*').order('name', { ascending: true }).limit(500)
    if (dq) query = query.ilike('name', `%${dq}%`)
    const { data } = await query
    setItems(data || [])
  }
  useEffect(() => { load() }, [dq])

  async function save(club: AdminClub) {
    if (saving) return
    setSaving(true)
    try {
      const error = await saveClub(club)
      if (error) { alert(error); return }
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id?: string) {
    if (!id) return
    const ok = confirm('¿Eliminar este club?')
    if (!ok) return
    const { error } = await sb().from('clubs').delete().eq('id', id)
    if (error) { alert('No se pudo eliminar: ' + error.message); return }
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn btn-secondary">← Volver</Link>
          <h1 className="text-2xl font-semibold">Clubs</h1>
        </div>
        <button className="btn btn-primary" onClick={()=>setEditing({ name: '', status: 'approved' })}>Nuevo</button>
      </div>
      <input className="w-full bg-transparent border border-white/10 rounded-xl p-2" placeholder="Buscar club..." value={q} onChange={e=>setQ(e.target.value)} />
      {/* Nuevo se abre arriba, fuera de la lista: no tiene fila propia donde
          desplegarse debajo. Editar si la tiene (ver dentro del map). */}
      {editing && !editing.id && (
        <ClubForm key="new" initial={editing} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />
      )}
      <div className="grid gap-2">
        {items.map(c => (
          <div key={c.id} className="grid gap-2">
            <div className="card p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.featured && <span className="text-[10px] bg-[#d8af3a]/15 text-[#d8af3a] px-2 py-0.5 rounded-full font-semibold">⭐ Destacado</span>}
                </div>
                <div className="text-sm text-white/60">{c.address || '-'} · {c.status}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={()=>setEditing(editing?.id === c.id ? null : c)}>{editing?.id === c.id ? 'Cerrar' : 'Editar'}</button>
                <button className="btn btn-secondary" onClick={()=>remove(c.id)}>Eliminar</button>
              </div>
            </div>
            {/* Se despliega justo debajo de su fila, igual que en DJs: antes el
                formulario solo aparecia al final de la lista entera. */}
            {editing && editing.id === c.id && (
              <ClubForm key={c.id} initial={editing} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />
            )}
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
    </div>
  )
}
