"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useState } from 'react'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }
function bucket() { return (process.env.NEXT_PUBLIC_SUPABASE_BUCKET as string) || 'media' }

// Los tamanos se generan aqui, al subir, y no en cada peticion: el plan Pro de
// Supabase solo incluye 100 imagenes origen distintas por ciclo en
// /render/image/, y un directorio con cientos de fichas lo supera siempre.
// Ver lib/image-loader.ts, que es quien decide luego cual de estos pedir.
const VARIANTS = [256, 640]
const MAX_WIDTH = 1600
const QUALITY = 0.82

// El GIF perderia la animacion al rasterizarlo y el SVG dejaria de ser vector.
// Ninguno de los dos pesa lo suficiente como para que compense.
const PASSTHROUGH = ['image/gif', 'image/svg+xml']

function slugify(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'img'
}

async function encode(bitmap: ImageBitmap, width: number): Promise<Blob | null> {
  // Nunca se amplia: si el original es mas estrecho que el ancho pedido se
  // queda como esta y se descarta esa variante.
  const scale = Math.min(1, width / bitmap.width)
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
}

// cacheControl de un ano: el nombre lleva timestamp, asi que un fichero nunca
// cambia de contenido y no hay que revalidarlo.
async function put(path: string, body: Blob, contentType?: string) {
  const { error } = await sb().storage.from(bucket()).upload(path, body, {
    cacheControl: '31536000',
    upsert: false,
    contentType: contentType || body.type || undefined,
  })
  if (error) throw error
}

async function uploadRaw(file: File, stem: string): Promise<string> {
  const ext = (file.name.match(/\.[^.]+$/)?.[0] || '').toLowerCase()
  const path = `${stem}${ext}`
  await put(path, file, file.type)
  return sb().storage.from(bucket()).getPublicUrl(path).data.publicUrl
}

async function uploadVariants(file: File, stem: string): Promise<string> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Formatos que el navegador no sabe decodificar (HEIC en algunos casos).
    return uploadRaw(file, stem)
  }

  const base = await encode(bitmap, MAX_WIDTH)
  if (!base) {
    bitmap.close()
    return uploadRaw(file, stem)
  }

  const made: number[] = []
  for (const w of VARIANTS) {
    if (bitmap.width <= w) continue
    const blob = await encode(bitmap, w)
    if (!blob) continue
    await put(`${stem}_${w}.webp`, blob, 'image/webp')
    made.push(w)
  }
  bitmap.close()

  await put(`${stem}.webp`, base, 'image/webp')
  const url = sb().storage.from(bucket()).getPublicUrl(`${stem}.webp`).data.publicUrl
  // El ?v= le dice al loader que variantes existen sin tener que comprobarlo.
  return made.length ? `${url}?v=${made.join(',')}` : url
}

export function UploadImage({ value, onChange, folder }: { value?: string | null; onChange: (url: string | null) => void; folder: 'clubs' | 'events' | 'djs' }) {
  const [loading, setLoading] = useState(false)

  async function upload(file: File) {
    setLoading(true)
    try {
      const stem = `${folder}/${Date.now()}-${slugify(file.name)}`
      const url = PASSTHROUGH.includes(file.type)
        ? await uploadRaw(file, stem)
        : await uploadVariants(file, stem)
      onChange(url)
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
