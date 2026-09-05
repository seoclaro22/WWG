import type { Entry } from '@/lib/sitemap-data'

// Serializacion del sitemap a mano. Next genera el XML solo desde
// app/sitemap.ts, pero solo puede producir un fichero: para servir un indice
// mas un fichero por bloque hacen falta rutas propias, y por tanto el XML.

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isoDate(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString()
}

export function urlsetXml(entries: Entry[]) {
  const urls = entries.map((e) => {
    const parts = [`    <loc>${esc(e.url)}</loc>`]
    if (e.lastModified) parts.push(`    <lastmod>${isoDate(e.lastModified)}</lastmod>`)
    if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`)
    if (e.priority != null) parts.push(`    <priority>${e.priority}</priority>`)
    const langs = e.alternates?.languages || {}
    for (const [lang, href] of Object.entries(langs)) {
      if (typeof href !== 'string') continue
      parts.push(`    <xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(href)}"/>`)
    }
    return `  <url>\n${parts.join('\n')}\n  </url>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`
}

export function sitemapIndexXml(locs: string[]) {
  // Sin lastmod inventado: mismo motivo que en las entradas de cada bloque
  // (ver lib/sitemap-data.ts). Ponerle "ahora" a los 6 sub-sitemaps en cada
  // regeneracion horaria, aunque no haya cambiado nada dentro, es la fecha
  // poco fiable que ese mismo comentario advierte que Google acaba
  // ignorando. lastmod es opcional en el indice.
  const items = locs.map((loc) => `  <sitemap>\n    <loc>${esc(loc)}</loc>\n  </sitemap>`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.join('\n')}
</sitemapindex>
`
}

export function xmlResponse(body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
