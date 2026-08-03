"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useState } from 'react'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

export function UploadImage({ value, onChange, folder }: { value?: string | null; onChange: (url: string | null) => void; folder: 'clubs' | 'events' | 'djs' }) {
  const [loading, setLoading] = useState(false)

  async function upload(file: File) {
    setLoading(true)
    try {
      const path = `${folder}/${Date.now()}-${file.name}`
      const { error } = await sb().storage.from((process.env.NEXT_PUBLIC_SUPABASE_BUCKET as string) || 'media').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })
      if (error) throw error
      const { data } = sb().storage.from((process.env.NEXT_PUBLIC_SUPABASE_BUCKET as string) || 'media').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      alert('No se pudo subir la imagen. Asegura que existe el bucket "media" público en Supabase.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <img src={value} alt="preview" className="w-full max-h-48 object-cover rounded-xl border border-white/10" />
      )}
      <div className="flex items-center gap-2">
        <label className="btn btn-secondary cursor-pointer">
          {loading ? 'Subiendo...' : (value ? 'Reemplazar' : 'Subir imagen')}
          <input type="file" accept="image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) upload(f) }} />
        </label>
        {value && <button className="btn btn-secondary" onClick={()=>onChange(null)}>Quitar</button>}
      </div>
    </div>
  )
}


