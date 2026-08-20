// Segmento "genero": la palabra que le toca a castellano (ver GENRE_SEGMENT
// en lib/hrefs.ts). En ingles/aleman, una peticion aqui redirige a la
// version en "/genre/..." - ver lib/genre-page.tsx.
import { genreMetadata, renderGenrePage } from '@/lib/genre-page'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { locale: string; name: string } }) {
  return genreMetadata(params, 'genero')
}

export default async function GeneroPage({ params }: { params: { locale: string; name: string } }) {
  return renderGenrePage(params, 'genero')
}
