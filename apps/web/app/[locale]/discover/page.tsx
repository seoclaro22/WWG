import { SafeImage } from '@/components/SafeImage'
import { Filters } from '@/components/Filters'
import { QuickDateChips } from '@/components/QuickDateChips'
import { countClubs, countDjs, countUpcomingEvents, fetchClubsPublic, fetchDjsPublic, fetchEvents } from '@/lib/db'
import { T } from '@/components/T'
import { LoadMoreList } from '@/components/LoadMoreList'
import { buildAlternates, localePath, listMeta } from '@/lib/seo'
import { EventListJsonLd } from '@/components/EventListJsonLd'
import { clubPath, djPath } from '@/lib/hrefs'
import { vacios } from '@/lib/seo-pages'
import { CATALOG_LIMIT, PAGE_SIZE, rangeFromDateParam, toClubItem, toDjItem, toEventItem } from '@/lib/list-items'

// Los filtros (q, date, genre, zone, tab) son navegacion facetada: cada
// combinacion es una URL distinta con el mismo inventario reordenado. Sin
// control, Googlebot se dedica a rastrear miles de cruces en vez de las
// fichas y las paginas de zona, que son las que posicionan.
//
// El canonical ya apuntaba al /discover limpio, pero el canonical es una
// sugerencia y no evita el rastreo. El noindex,follow si: la variante
// filtrada no compite, y sus enlaces salientes se siguen rastreando.
export function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { title, description } = listMeta('discover', params.locale)
  const isFiltered = Object.values(searchParams || {}).some((v) => v != null && v !== '')

  return {
    title,
    description,
    alternates: buildAlternates('/discover', params.locale),
    openGraph: { title, description, type: 'website' },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  }
}

// rangeFromDateParam vive en lib/list-items.ts: /api/list la necesita
// exactamente igual para que la tanda que trae "Cargar mas" caiga en la misma
// ventana temporal que la primera pintada aqui.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default async function DiscoverPage({ params, searchParams }: { params: { locale: string }; searchParams: { q?: string; date?: string; genre?: string; zone?: string; tab?: string } }) {
  const lp = (p: string) => localePath(p, params.locale)
  const vacio = vacios(params.locale)
  const tab = (searchParams?.tab || 'events') as 'events' | 'clubs' | 'djs'
  const zone = searchParams?.zone
  const { from, to } = rangeFromDateParam(searchParams?.date)
  // Mismo tope que /api/list (CATALOG_LIMIT) para caer en la misma entrada de
  // cache: solo se pinta la primera tanda (PAGE_SIZE), "Cargar mas" trae el
  // resto de este mismo array ya cacheado, no una consulta nueva.
  const [events, clubs, djs, featuredClubs, featuredDjs, upcomingCount, clubsCount, djsCount] = await Promise.all([
    tab === 'events' ? fetchEvents({ q: searchParams?.q ?? undefined, from, to, genre: searchParams?.genre ?? undefined, zone: zone ?? undefined, limit: CATALOG_LIMIT.events, sponsoredFirst: true, grace: searchParams?.date === 'today' ? true : undefined }) : Promise.resolve([] as any[]),
    tab === 'clubs' ? fetchClubsPublic({ q: searchParams?.q ?? undefined, zone: zone ?? undefined, genre: searchParams?.genre ?? undefined, limit: CATALOG_LIMIT.clubs }) : Promise.resolve([] as any[]),
    tab === 'djs' ? fetchDjsPublic({ q: searchParams?.q ?? undefined, genre: searchParams?.genre ?? undefined, limit: CATALOG_LIMIT.djs }) : Promise.resolve([] as any[]),
    fetchClubsPublic({ zone: zone ?? undefined, limit: 24 }),
    fetchDjsPublic({ limit: 24 }),
    countUpcomingEvents({ zone: zone ?? undefined }),
    // Se piden siempre, no solo en su pestana: el numero tiene que verse en
    // el pill aunque estes mirando otra pestana, igual que ya pasaba con el
    // de eventos.
    countClubs({ zone: zone ?? undefined }),
    countDjs(),
  ])
  const carouselClubs = shuffle(featuredClubs).slice(0, 8)
  const carouselDjs = shuffle(featuredDjs.filter((dj: any) => Array.isArray(dj.images) && dj.images[0])).slice(0, 8)
  // El ItemList solo en el /discover limpio: las variantes filtradas van con
  // noindex y el schema ahi es peso muerto.
  const isFiltered = Object.values(searchParams || {}).some((v) => v != null && v !== '')
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />
      <div className="relative z-10 space-y-5">
        {/* h1 desde listMeta: asi title y h1 quedan alineados por idioma y el
            keyword se edita en un solo sitio (lib/seo.ts). Cambia con la
            pestana para que las variantes noindex tampoco mientan. */}
        <h1 className="text-xl md:text-3xl font-bold text-white">
          {listMeta(tab === 'events' ? 'discover' : tab, params.locale).title}
        </h1>
        {tab === 'events' && !isFiltered && (
          <EventListJsonLd
            events={events}
            locale={params.locale}
            name={listMeta('discover', params.locale).title}
          />
        )}
        {/* Tabs con pill gold. El numero va en una insignia flotante sobre la
            esquina (estilo notificacion) y no en linea con el texto: metido
            en la propia frase, "Proximos eventos" ya no cabia en una linea y
            la pestana se estiraba mas alta que las otras dos. */}
        <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-1 w-fit">
          {([
            { key: 'events', label: <T k="tabs.events" />, count: upcomingCount },
            { key: 'clubs',  label: <T k="tabs.clubs" />,  count: clubsCount },
            { key: 'djs',    label: <T k="tabs.djs" />,    count: djsCount },
          ] as const).map(({ key, label, count }) => (
            <a
              key={key}
              href={lp(`/discover?tab=${key}${zone ? `&zone=${encodeURIComponent(zone)}` : ""}`)}
              className={`relative px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key
                  ? 'bg-[#d8af3a] text-black shadow-[0_0_16px_rgba(216,175,58,0.4)]'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`absolute -top-2 -right-2 min-w-[19px] h-[19px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full border-2 border-[#07060a] leading-none ${
                  tab === key ? 'bg-black text-[#d8af3a] badge-pulse' : 'bg-[#d8af3a] text-black'
                }`}>{count}</span>
              )}
            </a>
          ))}
        </div>
        {/* Carousel: Clubs destacados */}
        {carouselClubs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70"><T k="discover.featured_clubs" /></p>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {carouselClubs.map((c: any) => {
                const img: string | undefined = Array.isArray(c.images) ? c.images[0] : (c.logo_url || undefined)
                return (
                  <a key={c.id} href={lp(clubPath(c))} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <SafeImage src={img} alt={c.name} width={100} height={100} sizes="100px" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">♣</div>
                      }
                    </div>
                    <span className="text-xs text-white/80 text-center leading-tight line-clamp-2 w-full">{c.name}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        {/* Carousel: DJs destacados */}
        {carouselDjs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70"><T k="discover.featured_djs" /></p>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {carouselDjs.map((dj: any) => {
                const img: string | undefined = Array.isArray(dj.images) ? dj.images[0] : undefined
                return (
                  <a key={dj.id} href={lp(djPath(dj))} className="snap-start shrink-0 flex flex-col items-center gap-1.5 w-[100px]">
                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-white/5 border border-white/10">
                      {img
                        ? <SafeImage src={img} alt={dj.name} width={100} height={100} sizes="100px" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-2xl">♪</div>
                      }
                    </div>
                    <span className="text-xs text-white/80 text-center leading-tight line-clamp-2 w-full">{dj.name}</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}
        <Filters />
        {tab === 'events' && <QuickDateChips />}
        {/* Cada pestana renderiza solo las primeras PAGE_SIZE tarjetas; el
            resto del array ya traido (hasta CATALOG_LIMIT) se sirve bajo
            demanda con "Cargar mas" via /api/list, que replica estos mismos
            filtros para que la tanda siguiente encaje con la que ya se ve. */}
        {tab === 'events' && (
          <LoadMoreList
            key={`events-${searchParams?.q || ''}-${searchParams?.zone || ''}-${searchParams?.genre || ''}-${searchParams?.date || ''}`}
            kind="events"
            initialItems={events.slice(0, PAGE_SIZE).map((e) => toEventItem(e, params.locale))}
            initialDone={events.length <= PAGE_SIZE}
            params={{ q: searchParams?.q, zone, genre: searchParams?.genre, date: searchParams?.date }}
            emptyLabel={vacio.eventosFiltro}
          />
        )}
        {tab === 'clubs' && (
          <LoadMoreList
            key={`clubs-${searchParams?.q || ''}-${zone || ''}-${searchParams?.genre || ''}`}
            kind="clubs"
            initialItems={clubs.slice(0, PAGE_SIZE).map(toClubItem)}
            initialDone={clubs.length <= PAGE_SIZE}
            params={{ q: searchParams?.q, zone, genre: searchParams?.genre }}
            emptyLabel={vacio.clubsZona}
          />
        )}
        {tab === 'djs' && (
          <LoadMoreList
            key={`djs-${searchParams?.q || ''}-${searchParams?.genre || ''}`}
            kind="djs"
            initialItems={djs.slice(0, PAGE_SIZE).map(toDjItem)}
            initialDone={djs.length <= PAGE_SIZE}
            params={{ q: searchParams?.q, genre: searchParams?.genre }}
            emptyLabel={vacio.djsBusqueda}
          />
        )}
      </div>
    </div>
  )
}

export const revalidate = 0
export const dynamic = 'force-dynamic'
