"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { UploadImage } from '@/components/UploadImage'
import { GenreSelect } from '@/components/GenreSelect'
import Link from 'next/link'
import { useDebounce } from '@/components/hooks/useDebounce'

type Club = {
  id?: string
  name: string
  description?: string | null
  description_i18n?: Record<string, string> | null
  address?: string | null
  referral_link?: string | null
  status?: string
  images?: any
  zone?: string | null
  genres?: string[] | null
  links?: any
  logo_url?: string | null
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

export default function AdminClubsPage() {
  return (
    <AdminGuard>
      <ClubsManager />
    </AdminGuard>
  )
}

function ClubsManager() {
  const [items, setItems] = useState<Club[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Club | null>(null)
  const dq = useDebounce(q, 300)

  async function load() {
    const s = sb()
    // select('*') para tolerar esquemas sin columnas nuevas (logo_url, etc.)
    let query = s.from('clubs').select('*').order('created_at', { ascending: false }).limit(100)
    if (dq) query = query.ilike('name', `%${dq}%`)
    const { data } = await query
    setItems(data || [])
  }
  useEffect(() => { load() }, [dq])

  async function save(club: Club) {
    const s = sb()
    const once = async () => club.id
      ? s.from('clubs').update(club).eq('id', club.id!)
      : s.from('clubs').insert({ ...club, status: club.status || 'approved' })
    let { error } = await once()
    // Reintenta sin logo_url si la columna no existe
    if (error && /logo_url/i.test(error.message || '')) {
      const payload: any = { ...club }
      delete payload.logo_url
      if (club.id) ({ error } = await s.from('clubs').update(payload).eq('id', club.id))
      else ({ error } = await s.from('clubs').insert({ ...payload, status: club.status || 'approved' }))
    }
    if (error) { alert('No se pudo guardar el club: ' + error.message); return }
    setEditing(null)
    load()
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
      <div className="grid gap-2">
        {items.map(c => (
          <div key={c.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-white/60">{c.address || '-'} · {c.status}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={()=>setEditing(c)}>Editar</button>
              <button className="btn btn-secondary" onClick={()=>remove(c.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="muted">Sin resultados</div>}
      </div>
      {editing && <ClubForm key={editing.id || 'new'} initial={editing} onCancel={()=>setEditing(null)} onSave={save} />}
    </div>
  )
}

function ClubForm({ initial, onCancel, onSave }: { initial: Club; onCancel: () => void; onSave: (c: Club) => void }) {
  const [form, setForm] = useState<Club>(initial)
  useEffect(() => { setForm(initial) }, [initial])
  const cover = Array.isArray(initial.images) && initial.images.length ? initial.images[0] : null
  const [image, setImage] = useState<string | null>(cover)
  const [logo, setLogo] = useState<string | null>(initial.logo_url || null)
  return (
    <div className="card p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Nombre</label>
          <input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Zona</label>
          <input value={form.zone || ''} onChange={e=>setForm({ ...form, zone: e.target.value })} placeholder="Mallorca / Ibiza / Barcelona / Madrid" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div>
          <label className="block text-sm">Estado</label>
          <select value={form.status || 'approved'} onChange={e=>setForm({ ...form, status: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2">
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Direccion</label>
          <input value={form.address || ''} onChange={e=>setForm({ ...form, address: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Link de referido</label>
          <input value={form.referral_link || ''} onChange={e=>setForm({ ...form, referral_link: e.target.value })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Descripcion</label>
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
          <label className="block text-sm">Generos predominantes</label>
          <GenreSelect value={form.genres || []} onChange={(vals)=>setForm({ ...form, genres: vals })} allowCreate />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Imagen (portada)</label>
          <UploadImage value={image || undefined} onChange={(url)=>setImage(url)} folder="clubs" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm">Logo</label>
          <UploadImage value={logo || undefined} onChange={(url)=>setLogo(url)} folder="clubs" />
        </div>
        <div className="md:col-span-2 grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Web</label>
            <input value={(form.links?.web)||''} onChange={e=>setForm({ ...form, links: { ...(form.links||{}), web: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
          </div>
          <div>
            <label className="block text-sm">Instagram</label>
            <input value={(form.links?.instagram)||''} onChange={e=>setForm({ ...form, links: { ...(form.links||{}), instagram: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
          </div>
          <div>
            <label className="block text-sm">Facebook</label>
            <input value={(form.links?.facebook)||''} onChange={e=>setForm({ ...form, links: { ...(form.links||{}), facebook: e.target.value } })} className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
          </div>
          <div>
            <label className="block text-sm">Telefono (privado)</label>
            <input value={(form.links?.phone)||''} onChange={e=>setForm({ ...form, links: { ...(form.links||{}), phone: e.target.value } })} placeholder="Solo visible en backoffice" className="w-full bg-transparent border border-white/10 rounded-xl p-2" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={()=>onSave({ ...form, images: image ? [image] : [], logo_url: logo })}>Guardar</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
