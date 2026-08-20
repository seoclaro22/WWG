// Genera las miniaturas de las imagenes que ya estaban subidas antes de que
// UploadImage.tsx empezara a crearlas, y reescribe las URLs de la base de datos
// para que lib/image-loader.ts sepa que existen.
//
// Sin esto el cambio solo afecta a las imagenes nuevas: las viejas se seguirian
// sirviendo a tamano completo (no se rompen, pero pesan de mas en movil).
//
// Uso:
//   npm i -D sharp
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-image-variants.mjs
//   ...                                                                        --apply
//
// Sin --apply no escribe nada: lista lo que haria y termina.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const URL_BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'media'
const APPLY = process.argv.includes('--apply')

if (!URL_BASE || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Mismos valores que components/UploadImage.tsx. Si cambian alli, cambian aqui.
const VARIANTS = [256, 640]
const MAX_WIDTH = 1600
const QUALITY = 82

const FOLDERS = ['clubs', 'events', 'djs']
const IS_IMAGE = /\.(jpe?g|png|webp|avif|bmp|tiff?)$/i
const IS_VARIANT = /_(\d+)\.webp$/i

const db = createClient(URL_BASE, SERVICE_KEY, { auth: { persistSession: false } })
const store = db.storage.from(BUCKET)

const publicUrl = (path) => store.getPublicUrl(path).data.publicUrl

async function listFolder(folder) {
  const out = []
  for (let page = 0; ; page++) {
    const { data, error } = await store.list(folder, { limit: 100, offset: page * 100 })
    if (error) throw error
    if (!data?.length) break
    out.push(...data.filter((f) => f.id).map((f) => `${folder}/${f.name}`))
    if (data.length < 100) break
  }
  return out
}

async function processOne(path, existing) {
  const stem = path.replace(/\.[^.]+$/, '')
  const basePath = `${stem}.webp`

  const { data: blob, error } = await store.download(path)
  if (error) throw error
  const input = Buffer.from(await blob.arrayBuffer())
  const { width } = await sharp(input).metadata()
  if (!width) return null

  const made = []
  for (const w of VARIANTS) {
    if (width <= w) continue
    const target = `${stem}_${w}.webp`
    if (!existing.has(target)) {
      const body = await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
      if (APPLY) {
        const up = await store.upload(target, body, { cacheControl: '31536000', upsert: true, contentType: 'image/webp' })
        if (up.error) throw up.error
      }
    }
    made.push(w)
  }

  // Si el fichero de origen ya es el .webp base no se toca: reescribirlo seria
  // destruir el original para no ganar nada.
  if (path !== basePath && !existing.has(basePath)) {
    const body = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
    if (APPLY) {
      const up = await store.upload(basePath, body, { cacheControl: '31536000', upsert: true, contentType: 'image/webp' })
      if (up.error) throw up.error
    }
  }

  if (!made.length) return null
  return { from: publicUrl(path), to: `${publicUrl(basePath)}?v=${made.join(',')}` }
}

// Reescribe en la base de datos las URLs que acaban de cambiar de sitio.
async function rewrite(table, column, map) {
  const { data, error } = await db.from(table).select(`id, ${column}`)
  if (error) throw error

  let touched = 0
  for (const row of data || []) {
    const current = row[column]
    let next

    if (Array.isArray(current)) {
      next = current.map((u) => map.get(String(u).split('?')[0]) || u)
      if (JSON.stringify(next) === JSON.stringify(current)) continue
    } else if (typeof current === 'string' && current) {
      next = map.get(current.split('?')[0])
      if (!next) continue
    } else {
      continue
    }

    touched++
    if (APPLY) {
      const up = await db.from(table).update({ [column]: next }).eq('id', row.id)
      if (up.error) throw up.error
    }
  }
  return touched
}

const map = new Map()
let done = 0
let failed = 0

for (const folder of FOLDERS) {
  const paths = await listFolder(folder)
  const existing = new Set(paths)
  const sources = paths.filter((p) => IS_IMAGE.test(p) && !IS_VARIANT.test(p))
  console.log(`${folder}: ${sources.length} imagenes origen`)

  for (const path of sources) {
    try {
      const moved = await processOne(path, existing)
      if (moved) {
        map.set(moved.from, moved.to)
        done++
      }
    } catch (e) {
      failed++
      console.warn(`  fallo ${path}: ${e.message}`)
    }
  }
}

console.log(`\nVariantes generadas para ${done} imagenes (${failed} fallos)`)

const rewrites = [
  ['clubs', 'images'],
  ['clubs', 'logo_url'],
  ['djs', 'images'],
  ['events', 'images'],
]
for (const [table, column] of rewrites) {
  const n = await rewrite(table, column, map)
  console.log(`${table}.${column}: ${n} filas`)
}

if (!APPLY) console.log('\nSimulacion. Ejecuta con --apply para escribir.')
