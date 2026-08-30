"use client"
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { UploadImage } from '@/components/UploadImage'
import { GenreSelect } from '@/components/GenreSelect'

export type AdminDJ = {
  id?: string
  name: string
  short_bio?: string | null
  bio?: string | null
  spotify_embed?: string | null
  genres?: string[] | null
  images?: any
  short_bio_i18n?: any
  bio_i18n?: any
}

export function djPayload(dj: AdminDJ) {
  return {
    name: dj.name,
    short_bio: dj.short_bio || null,
    bio: dj.bio ?? null,
    spotify_embed: dj.spotify_embed || null,
    genres: dj.genres || [],
    images: dj.images || [],
    short_bio_i18n: dj.short_bio_i18n || null,
    bio_i18n: dj.bio_i18n || null,
  }
}

// Un esquema sin la columna spotify_embed da un error que no dice nada al que
// lo lee: se traduce a algo accionable.
export function djErrorMessage(error: any, action: string) {
  const msg = String(error?.message || '')
  if (/spotify_embed/i.test(msg)) {
    return 'Falta la columna spotify_embed en la tabla djs. Actualiza la base de datos.'
  }
  return `No se pudo ${action} el DJ: ` + (msg || 'Error desconocido')
}

// Devuelve el mensaje de error, o null si fue bien.
export async function saveDj(dj: AdminDJ): Promise<string | null> {
  const payload = djPayload(dj)
  const { error } = dj.id
    ? await supabaseBrowser.from('djs').update(payload).eq('id', dj.id)
    : await supabaseBrowser.from('djs').insert(payload)
  return error ? djErrorMessage(error, dj.id ? 'guardar' : 'crear') : null
}

export function DJForm({ initial, onCancel, onSave, saving }: {
  initial: AdminDJ
  onCancel: () => void
  onSave: (d: AdminDJ) => void
  saving?: boolean
}) {
  const [form, setForm] = useState<AdminDJ>({ ...initial, genres: initial.genres || [], images: initial.images || [] })
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
