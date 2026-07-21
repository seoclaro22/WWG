import { notFound } from 'next/navigation'
import { SITEMAP_SEGMENTS, type SegmentName } from '@/lib/sitemap-data'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-xml'

// Un fichero por bloque: /sitemaps/eventos.xml, /sitemaps/zonas.xml, etc.
// El .xml va dentro del parametro (Next no admite carpetas con parte fija y
// parte dinamica) y ademas hace que el middleware de idioma lo ignore, porque
// su matcher excluye cualquier ruta con extension.

export const revalidate = 3600

export function generateStaticParams() {
  return Object.keys(SITEMAP_SEGMENTS).map((name) => ({ segment: `${name}.xml` }))
}

export async function GET(_req: Request, { params }: { params: { segment: string } }) {
  const name = params.segment.replace(/\.xml$/, '') as SegmentName
  const build = SITEMAP_SEGMENTS[name]
  if (!build) notFound()
  return xmlResponse(urlsetXml(await build()))
}
