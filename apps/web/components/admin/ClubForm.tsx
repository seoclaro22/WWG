"use client"
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { UploadImage } from '@/components/UploadImage'
import { GenreSelect } from '@/components/GenreSelect'

export type AdminClub = {
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
  featured?: boolean
}

// Devuelve el mensaje de error, o null si fue bien.
export async function saveClub(club: AdminClub): Promise<string | null> {
  const s = supabaseBrowser
  const { error } = club.id
    ? await s.from('clubs').update(club).eq('id', club.id)
    : await s.from('clubs').insert({ ...club, status: club.status || 'approved' })
  return error ? 'No se pudo guardar el club: ' + error.message : null
}

export function ClubForm({ initial, onCancel, onSave, saving }: {
  initial: AdminClub
  onCancel: () => void
  onSave: (c: AdminClub) => void
  saving?: boolean
}) {
  const [form, setForm] = useState<AdminClub>(initial)
  const cover = Array.isArray(initial.images) && initial.images.length ? initial.images[0] : null
  const [image, setImage] = useState<string | null>(cover)
  const [logo, setLogo] = useState<string | null>(initial.logo_url || null)
  useEffect(() => { setForm(initial) }, [initial])

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
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setForm({ ...form, featured: !form.featured })}
            className={`w-10 h-6 rounded-full transition-colors relative ${form.featured ? 'bg-[#d8af3a]' : 'bg-white/10'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.featured ? 'left-5' : 'left-1'}`} />
          </div>
          <span className="text-sm text-white/70">Club destacado en home</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          type="button"
          disabled={saving}
          onClick={()=>onSave({ ...form, images: image ? [image] : [], logo_url: logo })}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>
    </div>
  )
}
