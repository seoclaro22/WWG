import { Link } from '@/lib/navigation'
import { fetchEvents, fetchZonesMap } from '@/lib/db'
import { getSupabaseClient } from '@/lib/supabase'
import { dictionaries } from '@/lib/dictionaries'
import { routing } from '@/i18n/routing'
import { MIN_EVENTS_TO_INDEX, nearMeta, nearSlug, whenMeta, whenSlug, WHEN_KEYS } from '@/lib/seo-pages'
import { listMeta } from '@/lib/seo'

// Solo los generos con agenda real. Un genero "activo" en la tabla puede no
// tener ni un evento: sus paginas ya salian noindex y fuera del sitemap, pero
// el pie las seguia enlazando desde TODAS las paginas del sitio, mandando el
// enlazado interno justo a donde no hay nada.
async function fetchActiveGenres() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('genres').select('name').eq('status', 'active').order('name').limit(200)
  const names = (data || []).map((g: any) => g.name as string)
  const counts = await Promise.all(
    names.map((name) => fetchEvents({ genre: name, limit: MIN_EVENTS_TO_INDEX })),
  )
  return names.filter((_, i) => counts[i].length >= MIN_EVENTS_TO_INDEX)
}

export async function Footer({ locale }: { locale: string }) {
  const [zonesMap, genres] = await Promise.all([fetchZonesMap(), fetchActiveGenres()])
  const zones = Array.from(zonesMap.entries())

  // Traducido en servidor: son textos estaticos y no hace falta mandar
  // el diccionario al cliente solo para el pie.
  const dict = dictionaries[locale] || dictionaries[routing.defaultLocale]
  const t = (k: string) => dict[k] || k

  return (
    <footer className="mt-10 border-t border-white/10 py-8 text-sm text-white/50">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {zones.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">{t('footer.zones')}</p>
            <ul className="space-y-1">
              {/* Primero el hub "cerca de mi": es la pagina que reune todas las
                  ciudades, asi que enlazarla desde todo el sitio la refuerza. */}
              <li>
                <Link href={`/${nearSlug(locale)}`} className="hover:text-gold" prefetch={false}>{nearMeta(locale).eyebrow}</Link>
              </li>
              {/* Cada ciudad con sus dos paginas temporales al lado: son las que
                  persiguen "salir de fiesta hoy / este finde en X" y hasta ahora
                  no las enlazaba nada del sitio. */}
              {zones.map(([slug, name]) => (
                <li key={slug}>
                  <Link href={`/${slug}`} className="hover:text-gold" prefetch={false}>{name}</Link>
                  <span className="ml-1.5 text-xs text-white/25">
                    {WHEN_KEYS.map((k, i) => (
                      <span key={k}>
                        {i > 0 && ' · '}
                        <Link href={`/${slug}/${whenSlug(k, locale)}`} className="hover:text-gold" prefetch={false}>
                          {whenMeta(k, name, locale).eyebrow}
                        </Link>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {genres.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">{t('footer.genres')}</p>
            <ul className="space-y-1">
              {genres.map((name) => (
                <li key={name}>
                  <Link href={`/genre/${encodeURIComponent(name)}`} className="hover:text-gold" prefetch={false}>{name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">Where We Go</p>
          <ul className="space-y-1">
            {/* /clubs y /djs no los enlazaba nada del sitio: solo se llegaba a
                ellos via /discover?tab=..., que es noindex por ser facetado. */}
            <li><Link href="/clubs" className="hover:text-gold" prefetch={false}>{listMeta('clubs', locale).title}</Link></li>
            <li><Link href="/djs" className="hover:text-gold" prefetch={false}>{listMeta('djs', locale).title}</Link></li>
            <li><Link href="/promote" className="hover:text-gold" prefetch={false}>{t('nav.promote')}</Link></li>
            <li><Link href="/privacy" className="hover:text-gold" prefetch={false}>{t('account.privacy')}</Link></li>
            <li><Link href="/cookies" className="hover:text-gold" prefetch={false}>Cookies</Link></li>
          </ul>
        </div>

        {/* Anclas planas a proposito: el Link de next-intl prefijaria el idioma
            activo y romperia estos enlaces (en /de, "/en" seria "/de/en").
            Ademas dan a Google una via rastreable hacia cada arbol de idioma. */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">{t('footer.language')}</p>
          <ul className="space-y-1">
            <li><a href="/" hrefLang="es" className="hover:text-gold">Español</a></li>
            <li><a href="/en" hrefLang="en" className="hover:text-gold">English</a></li>
            <li><a href="/de" hrefLang="de" className="hover:text-gold">Deutsch</a></li>
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">© {new Date().getFullYear()} Where We Go</p>
    </footer>
  )
}
