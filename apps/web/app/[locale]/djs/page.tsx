import { fetchDjsPublic } from '@/lib/db'
import { DjCard2 } from '@/components/DjCard2'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates, listMeta, ogImage } from '@/lib/seo'
import { homeCrumb } from '@/lib/seo-pages'

// Listado indexable de DJs. Antes solo existia dentro de /discover?tab=djs,
// que es noindex por ser navegacion facetada: la ficha de cada DJ no tenia
// ningun listado indexable que la enlazase ni que compitiese por "DJs en
// Mallorca" o similares. Calca la estructura de /clubs, que ya cumplia esto.
export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = listMeta('djs', params.locale)
  const images = ogImage({ eyebrow: 'Where We Go', title, subtitle: description })
  return {
    title,
    description,
    alternates: buildAlternates('/djs', params.locale),
    openGraph: { title, description, type: 'website', images },
    twitter: { card: 'summary_large_image', images },
  }
}

export default async function DjsIndex({ params }: { params: { locale: string } }) {
  const djs = await fetchDjsPublic({ limit: 200 })
  const { title } = listMeta('djs', params.locale)

  return (
    <div className="space-y-4">
      <Breadcrumbs locale={params.locale} items={[
        { name: homeCrumb(params.locale), href: '/' },
        { name: title },
      ]} />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {djs.map((dj: any) => {
          const images: string[] = Array.isArray(dj.images) ? dj.images : []
          return (
            <DjCard2
              key={dj.id}
              dj={{
                id: dj.id,
                name: dj.name,
                name_i18n: dj.name_i18n,
                short_bio: dj.short_bio,
                short_bio_i18n: dj.short_bio_i18n,
                bio: dj.bio,
                bio_i18n: dj.bio_i18n,
                genres: dj.genres,
                image: images[0],
              }}
            />
          )
        })}
        {djs.length === 0 && <div className="muted">No hay DJs disponibles.</div>}
      </div>
    </div>
  )
}

export const revalidate = 60
