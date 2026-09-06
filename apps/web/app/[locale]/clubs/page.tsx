import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LoadMoreList } from '@/components/LoadMoreList'
import { fetchClubsPublic } from '@/lib/db'
import { buildAlternates, listMeta } from '@/lib/seo'
import { homeCrumb, vacios } from '@/lib/seo-pages'
import { CATALOG_LIMIT, PAGE_SIZE, toClubItem } from '@/lib/list-items'

export function generateMetadata({ params }: { params: { locale: string } }) {
  const { title, description } = listMeta('clubs', params.locale)
  return {
    title,
    description,
    alternates: buildAlternates('/clubs', params.locale),
    openGraph: { title, description, type: 'website' },
  }
}

export default async function ClubsIndex({ params }: { params: { locale: string } }) {
  // Mismo tope que /api/list (CATALOG_LIMIT.clubs) para caer en la misma
  // entrada de cache; solo se pinta la primera tanda (PAGE_SIZE).
  const clubs = await fetchClubsPublic({ limit: CATALOG_LIMIT.clubs })
  // El h1 decia "Clubs" en duro: ni coincidia con el <title> de la pagina ni
  // con el idioma de la URL. Se toma de listMeta, que es de donde ya salen el
  // titulo y la descripcion, asi que los tres dicen lo mismo.
  const { title, description } = listMeta('clubs', params.locale)
  return (
    <div className="space-y-4">
      <Breadcrumbs locale={params.locale} items={[
        { name: homeCrumb(params.locale), href: '/' },
        { name: title },
      ]} />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-white/60 max-w-xl">{description}</p>
      <LoadMoreList
        kind="clubs-row"
        initialItems={clubs.slice(0, PAGE_SIZE).map(toClubItem)}
        initialDone={clubs.length <= PAGE_SIZE}
        params={{}}
        emptyLabel={vacios(params.locale).clubs}
        gridClassName="grid gap-2"
      />
    </div>
  )
}

export const revalidate = 60
