"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { AdminDJ, DJForm, djErrorMessage, djPayload } from '@/components/admin/DJForm'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

export default function AdminDJsPage() {
  return (
    <AdminGuard>
      <DJsManager />
    </AdminGuard>
  )
}

function DJsManager() {
  const [items, setItems] = useState<AdminDJ[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AdminDJ | null>(null)
  const [saving, setSaving] = useState(false)
  const dq = useDebounce(q, 300)

  async function load() {
    const s = sb()
    let query = s.from('djs').select('id,name,short_bio,bio,spotify_embed,genres,images,short_bio_i18n,bio_i18n').order('name', { ascending: true }).limit(500)
    if (dq) query = query.ilike('name', `%${dq}%`)
    const { data } = await query
    setItems(data || [])
  }
  useEffect(() => { load() }, [dq])

  function toast(message: string) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message } }))
  }

  // Actualiza la lista en memoria en vez de recargar: con 500 DJs, releer la
  // tabla entera para reflejar un campo editado es la diferencia entre guardar
  // al instante y esperar a la consulta.
  async function save(dj: AdminDJ) {
    if (saving) return
    const s = sb()
    const payload = djPayload(dj)
    setSaving(true)
    try {
      if (dj.id) {
        const { error } = await s.from('djs').update(payload).eq('id', dj.id)
        if (error) { toast(djErrorMessage(error, 'guardar')); return }
        setItems(prev => prev.map(it => it.id === dj.id ? { ...it, ...payload } : it))
      } else {
        const { data, error } = await s.from('djs').insert(payload).select('id').maybeSingle()
        if (error) { toast(djErrorMessage(error, 'crear')); return }
        if (data?.id) setItems(prev => [{ id: data.id, ...payload } as any, ...prev])
        else await load()
      }
      setEditing(null)
      toast('DJ guardado.')
    } catch (e: any) {
      toast(djErrorMessage(e, 'guardar'))
    } finally {
      setSaving(false)
    }
  }

  async function removeDj(id?: string) {
    if (!id) return
    const ok = confirm('Eliminar este DJ?')
    if (!ok) return
    const { error } = await sb().from('djs').delete().eq('id', id)
    if (error) { alert('No se pudo eliminar: ' + error.message); return }
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn btn-secondary"><span aria-hidden="true">{'<'}</span> Volver</Link>
          <h1 className="text-2xl font-semibold">DJs</h1>
        </div>
        <button className="btn btn-primary" onClick={()=>setEditing({ name: '' })}>Nuevo</button>
      </div>
      <input className="w-full bg-transparent border border-white/10 rounded-xl p-2" placeholder="Buscar DJ..." value={q} onChange={e=>setQ(e.target.value)} />
      {editing && !editing.id && <DJForm initial={editing} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />}
      <div className="grid gap-2">
        {items.map(d => (
          <div key={d.id} className="grid gap-2">
            <div className="card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-white/60">{(d.genres || []).join(', ')}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={()=>setEditing(editing?.id === d.id ? null : d)}>{editing?.id === d.id ? 'Cerrar' : 'Editar'}</button>
                <button className="btn btn-secondary" onClick={()=>removeDj(d.id)}>Eliminar</button>
              </div>
            </div>
            {editing && editing.id === d.id && <DJForm initial={editing} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />}
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
    </div>
  )
}
