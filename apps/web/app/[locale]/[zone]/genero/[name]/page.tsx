// Segmento "genero": la palabra que le toca a castellano (ver GENRE_SEGMENT
// en lib/hrefs.ts). En ingles/aleman, una peticion aqui redirige a la
// version en "/genre/..." - ver lib/zone-genre-page.tsx.
import { renderZoneGenrePage, zoneGenreMetadata, zoneGenreStaticParams } from '@/lib/zone-genre-page'

export const revalidate = 300

export async function generateStaticParams() {
  return zoneGenreStaticParams('genero')
}

export async function generateMetadata({ params }: { params: { locale: string; zone: string; name: string } }) {
  return zoneGenreMetadata(params, 'genero')
}

export default async function ZoneGeneroPage({ params }: { params: { locale: string; zone: string; name: string } }) {
  return renderZoneGenrePage(params, 'genero')
}
