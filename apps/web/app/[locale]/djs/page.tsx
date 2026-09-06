import { fetchDjsPublic } from '@/lib/db'
import { LoadMoreList } from '@/components/LoadMoreList'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates, listMeta, ogImage } from '@/lib/seo'
import { homeCrumb, vacios } from '@/lib/seo-pages'
import { CATALOG_LIMIT, PAGE_SIZE, toDjItem } from '@/lib/list-items'

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
  // Se pide el catalogo con el mismo tope que /api/list (CATALOG_LIMIT.djs)
  // para caer en la misma entrada de cache; solo se pinta la primera tanda.
  const djs = await fetchDjsPublic({ limit: CATALOG_LIMIT.djs })
  const { title, description } = listMeta('djs', params.locale)

  return (
    <div className="space-y-4">
      <Breadcrumbs locale={params.locale} items={[
        { name: homeCrumb(params.locale), href: '/' },
        { name: title },
      ]} />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-white/60 max-w-xl">{description}</p>
      <LoadMoreList
        kind="djs"
        initialItems={djs.slice(0, PAGE_SIZE).map(toDjItem)}
        initialDone={djs.length <= PAGE_SIZE}
        params={{}}
        emptyLabel={vacios(params.locale).djs}
        gridClassName="grid gap-3 sm:grid-cols-2"
      />
    </div>
  )
}

export const revalidate = 60
