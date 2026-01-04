"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'
import { GenreSelect } from '@/components/GenreSelect'
import { UploadImage } from '@/components/UploadImage'

type DJ = { id?: string; name: string; short_bio?: string | null; bio?: string | null; spotify_embed?: string | null; genres?: string[] | null; images?: any; short_bio_i18n?: any; bio_i18n?: any }

function sb() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }) }

export default function AdminDJsPage() {
  return (
    <AdminGuard>
      <DJsManager />
    </AdminGuard>
  )
}

function DJsManager() {
  const [items, setItems] = useState<DJ[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<DJ | null>(null)
  const [saving, setSaving] = useState(false)
  const dq = useDebounce(q, 300)

  async function load() {
    const s = sb()
    let query = s.from('djs').select('id,name,short_bio,bio,spotify_embed,genres,images,short_bio_i18n,bio_i18n').order('created_at', { ascending: false }).limit(50)
    if (dq) query = query.ilike('name', `%${dq}%`)
    const { data } = await query
    setItems(data || [])
  }
  useEffect(() => { load() }, [dq])

  function toast(message: string) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message } }))
  }

  function missingSpotifyColumn(error: any) {
    const msg = String(error?.message || '')
    if (/spotify_embed/i.test(msg)) {
      toast('Falta la columna spotify_embed en la tabla djs. Actualiza la base de datos.')
      return true
    }
    return false
  }

  async function save(dj: DJ) {
    if (saving) return
    const s = sb()
    const payload = {
      name: dj.name,
      short_bio: dj.short_bio || null,
      bio: dj.bio ?? null,
      spotify_embed: dj.spotify_embed || null,
      genres: dj.genres || [],
      images: dj.images || [],
      short_bio_i18n: dj.short_bio_i18n || null,
      bio_i18n: dj.bio_i18n || null
    }
    setSaving(true)
    try {
      if (dj.id) {
        const { error } = await s.from('djs').update(payload).eq('id', dj.id)
        if (error) { if (!missingSpotifyColumn(error)) toast('No se pudo guardar el DJ: ' + error.message); return }
        setItems(prev => prev.map(it => it.id === dj.id ? { ...it, ...payload } : it))
      } else {
        const { data, error } = await s.from('djs').insert(payload).select('id').maybeSingle()
        if (error) { if (!missingSpotifyColumn(error)) toast('No se pudo crear el DJ: ' + error.message); return }
        if (data?.id) setItems(prev => [{ id: data.id, ...payload } as any, ...prev])
        else await load()
      }
      setEditing(null)
      toast('DJ guardado.')
    } catch (e: any) {
      toast('No se pudo guardar el DJ: ' + (e?.message || 'Error desconocido'))
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
      <div className="grid gap-2">
        {items.map(d => (
          <div key={d.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-sm text-white/60">{(d.genres || []).join(', ')}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={()=>setEditing(d)}>Editar</button>
              <button className="btn btn-secondary" onClick={()=>removeDj(d.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
      {editing && <DJForm initial={editing} onCancel={()=>setEditing(null)} onSave={save} saving={saving} />}
    </div>
  )
}

function DJForm({ initial, onCancel, onSave, saving }: { initial: DJ; onCancel: () => void; onSave: (d: DJ) => void; saving: boolean }) {
  const [form, setForm] = useState<DJ>({ ...initial, genres: initial.genres || [], images: initial.images || [] })
  const cover = Array.isArray(form.images) && form.images.length ? form.images[0] : null
  return (
    <div className="card p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm">Nombre</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Géneros</label>
          <GenreSelect value={form.genres || []} onChange={(vals)=>setForm({ ...form, genres: vals })} allowCreate />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Descripción corta (listado)</label>
          <textarea value={form.short_bio || ''} onChange={e=>{ const v=e.target.value; const clipped = v.length>200? v.slice(0,200): v; setForm({ ...form, short_bio: clipped }) }} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={2} placeholder="Resumen breve para la tarjeta del DJ" />
          <div className="text-[11px] text-white/50 mt-1">Se recomienda 140–200 caracteres.</div>
        </div>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Descripción corta (EN)</label>
            <textarea value={(form.short_bio_i18n?.en) || ''} onChange={e=>setForm({ ...form, short_bio_i18n: { ...(form.short_bio_i18n||{}), en: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={2} />
          </div>
          <div>
            <label className="block text-sm">Descripción corta (DE)</label>
            <textarea value={(form.short_bio_i18n?.de) || ''} onChange={e=>setForm({ ...form, short_bio_i18n: { ...(form.short_bio_i18n||{}), de: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={2} />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Bio larga (ficha)</label>
          <textarea value={form.bio || ''} onChange={e=>setForm({ ...form, bio: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={4} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Spotify (embed o URL)</label>
          <textarea
            value={form.spotify_embed || ''}
            onChange={e=>setForm({ ...form, spotify_embed: e.target.value })}
            className="w-full bg-transparent border border-white/10 rounded-xl p-2"
            rows={3}
            placeholder="Pega el codigo iframe de Spotify o un enlace"
          />
          <div className="text-[11px] text-white/50 mt-1">Se guarda el embed para mostrarlo en la ficha del DJ.</div>
        </div>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Bio (EN)</label>
            <textarea value={(form.bio_i18n?.en) || ''} onChange={e=>setForm({ ...form, bio_i18n: { ...(form.bio_i18n||{}), en: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={4} />
          </div>
          <div>
            <label className="block text-sm">Bio (DE)</label>
            <textarea value={(form.bio_i18n?.de) || ''} onChange={e=>setForm({ ...form, bio_i18n: { ...(form.bio_i18n||{}), de: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" rows={4} />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Imagen (portada)</label>
          <UploadImage value={cover || undefined} onChange={(url)=>{ if (url) setForm({ ...form, images: [url] }); else setForm({ ...form, images: [] }) }} folder="djs" />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" type="button" onClick={()=>onSave(form)} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>
    </div>
  )
}
