// Segmento "genre": la palabra que le toca a ingles y aleman (ver
// GENRE_SEGMENT en lib/hrefs.ts). En castellano, una peticion aqui redirige
// a la version en "/genero/..." - ver lib/genre-page.tsx.
import { genreMetadata, renderGenrePage } from '@/lib/genre-page'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { locale: string; name: string } }) {
  return genreMetadata(params, 'genre')
}

export default async function GenrePage({ params }: { params: { locale: string; name: string } }) {
  return renderGenrePage(params, 'genre')
}
