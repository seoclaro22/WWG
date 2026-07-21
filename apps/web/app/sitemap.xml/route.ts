import { SITEMAP_SEGMENTS } from '@/lib/sitemap-data'
import { sitemapIndexXml, xmlResponse } from '@/lib/sitemap-xml'

// Indice de sitemaps. Sustituye al app/sitemap.ts de fichero unico: la misma
// URL que ya conoce Google y que apunta robots.txt, pero ahora enumerando un
// fichero por tipo de contenido, para poder leer en Search Console la
// indexacion de cada bloque por separado.

export const revalidate = 3600

const BASE = 'https://wherewego.site'

export function GET() {
  const locs = Object.keys(SITEMAP_SEGMENTS).map((name) => `${BASE}/sitemaps/${name}.xml`)
  return xmlResponse(sitemapIndexXml(locs))
}
