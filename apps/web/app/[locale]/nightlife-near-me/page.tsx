import { NearMePage, nearMetadata } from '@/components/NearMePage'

// Ruta de la pagina "cerca de mi" en en. El slug es la keyword, por eso hay
// una carpeta por idioma en vez de un segmento comun; el cuerpo es compartido.
const LOCALE = 'en'

export const revalidate = 600

export function generateMetadata() {
  return nearMetadata(LOCALE)
}

export default function Page({ params }: { params: { locale: string } }) {
  return <NearMePage locale={params.locale} expected={LOCALE} />
}
