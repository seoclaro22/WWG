// Segmento "genre": la palabra que le toca a ingles y aleman (ver
// GENRE_SEGMENT en lib/hrefs.ts). En castellano, una peticion aqui redirige
// a la version en "/genero/..." - ver lib/zone-genre-page.tsx.
import { renderZoneGenrePage, zoneGenreMetadata, zoneGenreStaticParams } from '@/lib/zone-genre-page'

export const revalidate = 300

export async function generateStaticParams() {
  return zoneGenreStaticParams('genre')
}

export async function generateMetadata({ params }: { params: { locale: string; zone: string; name: string } }) {
  return zoneGenreMetadata(params, 'genre')
}

export default async function ZoneGenrePage({ params }: { params: { locale: string; zone: string; name: string } }) {
  return renderZoneGenrePage(params, 'genre')
}
