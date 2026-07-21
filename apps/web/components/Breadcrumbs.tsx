import { Link } from '@/lib/navigation'
import { localizedUrl } from '@/lib/seo'
import { routing } from '@/i18n/routing'

export interface Crumb {
  name: string
  href?: string
}

export function Breadcrumbs({ items, locale }: { items: Crumb[]; locale?: string }) {
  // Las URLs del JSON-LD tienen que llevar el prefijo de idioma de la pagina.
  // Sin el, las migas de /en/* y /de/* apuntaban al arbol espanol, que es una
  // contradiccion entre la ruta declarada y la real.
  const lang = locale || routing.defaultLocale
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: localizedUrl(item.href, lang) } : {}),
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/40 flex-wrap">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-white/20">/</span>}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-[#d8af3a] transition-colors" prefetch={false}>{item.name}</Link>
            ) : (
              <span className="text-white/60">{item.name}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
