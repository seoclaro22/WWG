import { unstable_cache } from 'next/cache'
import { Link } from '@/lib/navigation'
import { countUpcomingEvents, fetchEvents, fetchZonesMap } from '@/lib/db'
import { getSupabaseClient } from '@/lib/supabase'
import { dictionaries } from '@/lib/dictionaries'
import { routing } from '@/i18n/routing'
import { MIN_EVENTS_TO_INDEX, nearMeta, nearSlug, whenMeta, whenRange, whenSlug, WHEN_KEYS } from '@/lib/seo-pages'
import { listMeta } from '@/lib/seo'
import { genrePath } from '@/lib/hrefs'

// Solo los generos con agenda real. Un genero "activo" en la tabla puede no
// tener ni un evento: sus paginas ya salian noindex y fuera del sitemap, pero
// el pie las seguia enlazando desde TODAS las paginas del sitio, mandando el
// enlazado interno justo a donde no hay nada.
async function loadActiveGenres() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('genres').select('name').eq('status', 'active').order('name').limit(200)
  const names = (data || []).map((g: any) => g.name as string)
  const counts = await Promise.all(
    names.map((name) => fetchEvents({ genre: name, limit: MIN_EVENTS_TO_INDEX })),
  )
  return names.filter((_, i) => counts[i].length >= MIN_EVENTS_TO_INDEX)
}

// Mismo umbral que los generos, y el mismo que aplica zoneEntries() en el
// sitemap. Sin esto el pie iba por libre: listaba todas las ciudades y sus dos
// paginas temporales aunque no tuvieran agenda, y esas paginas se sirven
// noindex. El sitio entero enlazaba a nueve URLs que Google no puede indexar.
async function loadActiveZones() {
  const zonesMap = await fetchZonesMap()
  const zones = await Promise.all(
    Array.from(zonesMap.entries()).map(async ([slug, name]) => {
      if ((await countUpcomingEvents({ zone: name })) < MIN_EVENTS_TO_INDEX) return null
      // Cada temporal se comprueba por separado: una ciudad puede tener finde
      // y no tener nada hoy.
      const when = await Promise.all(WHEN_KEYS.map(async (k) => {
        const { from, to } = whenRange(k)
        const found = await fetchEvents({ zone: name, from, to, limit: MIN_EVENTS_TO_INDEX })
        return found.length >= MIN_EVENTS_TO_INDEX ? k : null
      }))
      return { slug, name, when: when.filter((k): k is typeof WHEN_KEYS[number] => k !== null) }
    }),
  )
  return zones.filter((z): z is NonNullable<typeof z> => z !== null)
}

// El pie va en el layout, o sea en todas las paginas, y /discover es
// revalidate 0: sin cache, cada visita ahi lanzaba ~40 consultas a Supabase
// solo para pintar el pie. Se cachea el resultado 10 minutos, que es de sobra
// para una lista que solo cambia cuando una ciudad o un genero cruza el umbral
// de eventos.
const FOOTER_CACHE = { revalidate: 600 }
const fetchActiveGenres = unstable_cache(loadActiveGenres, ['footer-generos'], FOOTER_CACHE)
const fetchActiveZones = unstable_cache(loadActiveZones, ['footer-zonas'], FOOTER_CACHE)

export async function Footer({ locale }: { locale: string }) {
  const [zones, genres] = await Promise.all([fetchActiveZones(), fetchActiveGenres()])

  // Traducido en servidor: son textos estaticos y no hace falta mandar
  // el diccionario al cliente solo para el pie.
  const dict = dictionaries[locale] || dictionaries[routing.defaultLocale]
  const t = (k: string) => dict[k] || k

  return (
    <footer className="mt-10 border-t border-white/10 pt-8 pb-8 text-sm text-white/50">
      {/* Cabecera de marca: antes el pie no tenia logo propio y arrancaba
          directo en las columnas de enlaces, sin nada que lo identificara
          como parte de la web. */}
      <div className="flex items-center gap-3 pb-6 mb-8 border-b border-white/5">
        <Link href="/" className="text-lg font-semibold tracking-wide text-gold shrink-0">WWG</Link>
        <p className="text-xs text-white/55 truncate">{t('landing.subtitle')}</p>
      </div>

      {/* Tres columnas y no cuatro: con Zonas + Where We Go + Idioma + Generos
          en el mismo grid de 3, el cuarto grupo caia solo a una segunda fila
          dejando un hueco enorme al lado (Generos, con 20+ enlaces en lista
          vertical, estiraba la fila entera a mas de 600px). Generos baja
          aparte, en horizontal, que es donde una lista larga de terminos
          cabe sin desbordar. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8">
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
              {zones.map(({ slug, name, when }) => (
                <li key={slug}>
                  <Link href={`/${slug}`} className="hover:text-gold" prefetch={false}>{name}</Link>
                  <span className="ml-1.5 text-xs text-white/55">
                    {when.map((k, i) => (
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">Where We Go</p>
          <ul className="space-y-1">
            {/* /clubs y /djs no los enlazaba nada del sitio: solo se llegaba a
                ellos via /discover?tab=..., que es noindex por ser facetado. */}
            <li><Link href="/clubs" className="hover:text-gold" prefetch={false}>{listMeta('clubs', locale).title}</Link></li>
            <li><Link href="/djs" className="hover:text-gold" prefetch={false}>{listMeta('djs', locale).title}</Link></li>
            <li><Link href="/que-es-where-we-go" className="hover:text-gold" prefetch={false}>{t('about.eyebrow')}</Link></li>
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

      {genres.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-3">{t('footer.genres')}</p>
          {/* flex-wrap y no una lista vertical: son 20+ terminos, y en columna
              cada uno se estiraba la fila entera del grid de arriba. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {genres.map((name) => (
              <Link key={name} href={genrePath(name)} className="text-xs text-white/55 hover:text-gold" prefetch={false}>
                {name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 pt-6 border-t border-white/5 text-xs text-white/55">© {new Date().getFullYear()} Where We Go</p>
    </footer>
  )
}
