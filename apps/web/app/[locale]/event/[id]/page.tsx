import { Link, localizedPath } from '@/lib/navigation'
import { SafeImage } from '@/components/SafeImage'
import { fetchEvent, fetchEventLineup, fetchClub, fetchClubEvents, fetchRelatedEvents, slugifyZone } from '@/lib/db'
import { clubPath, djPath, eventPath } from '@/lib/hrefs'
import { EventCountdown } from '@/components/EventCountdown'
import { notFound, permanentRedirect } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ReserveButton } from '@/components/ReserveButton'
import { T } from '@/components/T'
import { LDate } from '@/components/LDate'
import { LocalText } from '@/components/LocalText'
import { ShareSheet } from '@/components/ShareSheet'
import { ClubDescriptionExpand } from '@/components/ClubDescriptionExpand'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { buildAlternates } from '@/lib/seo'
import { homeCrumb, dateTag, formatShortDate, formatEventDate, secciones, resumenEvento, noEncontrado, alts } from '@/lib/seo-pages'
import { AnswerBlock } from '@/components/AnswerBlock'

function getSpotifyEmbed(input?: string | null) {
  const raw = (input || '').trim()
  if (!raw) return null
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i)
  const heightMatch = raw.match(/height=["']?(\d{2,4})["']?/i)
  const url = iframeMatch ? iframeMatch[1] : raw
  try {
    const u = new URL(url)
    if (!u.hostname.endsWith('spotify.com')) return null
    let src = u.toString()
    if (!u.pathname.startsWith('/embed/')) {
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        src = `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`
      }
    }
    const path = new URL(src).pathname
    const isCompact = /\/embed\/(track|episode)\//.test(path)
    const height = heightMatch ? Number(heightMatch[1]) : (isCompact ? 152 : 352)
    return { src, height }
  } catch {}
  return null
}

// Fila compacta de evento. La usan "Mas del club" y "Te puede interesar": es
// el mismo markup en dos sitios, y duplicarlo era la alternativa.
function EventRow({ ev, locale, showVenue = false }: { ev: any; locale: string; showVenue?: boolean }) {
  const evImgs: string[] = Array.isArray(ev.images) ? ev.images : []
  const evImg = evImgs[0] || null
  return (
    <Link
      href={eventPath(ev)}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
    >
      {evImg ? (
        <SafeImage src={evImg} alt={alts(locale).miniEvento(ev.name)} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 shrink-0 flex items-center justify-center text-white/20 text-xl">♪</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-[#d8af3a] transition-colors">{ev.name}</p>
        {/* El club solo en los relacionados: en "Mas del club" seria repetir
            el mismo nombre en todas las filas. */}
        {showVenue && ev.club_name && <p className="text-xs text-white/55 truncate">{ev.club_name}</p>}
      </div>
      <span className="text-xs text-white/50 shrink-0"><LDate value={ev.start_at} timeZone="UTC" options={{ day: '2-digit', month: 'short' }} /></span>
    </Link>
  )
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const e: any = await fetchEvent(params.id)
  // Ver la nota de la ficha de club: el titulo del 404 iba en castellano fijo.
  if (!e) return { title: noEncontrado(params.locale).title }
  // El idioma sale de la URL. Estaba fijado a es-ES, asi que /en y /de servian
  // la fecha en espanol dentro de su propia descripcion.
  const date = new Date(e.start_at).toLocaleDateString(dateTag(params.locale), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const imgs: string[] = Array.isArray(e.images) ? e.images : []
  // El sitio ya no es solo Mallorca: si falta el club se usa la zona real y,
  // si tampoco la hay, se omite en vez de inventarla.
  const venue = e.club_name || e.zone || ''
  const description = (e.description || '').slice(0, 155) || `${e.name}${venue ? ` en ${venue}` : ''}, ${date}. Reserva tus entradas en Where We Go.`

  // Un evento terminado ya no le sirve a quien llega desde Google, pero la URL
  // debe seguir resolviendo para quien la tenga guardada o compartida. El cron
  // de archivado borra el evento a los 7 dias y a partir de ahi la ficha da 404
  // sola: esto solo cubre esa ventana.
  const endedAt = e.end_at
    ? new Date(e.end_at)
    : new Date(new Date(e.start_at).getTime() + 12 * 60 * 60 * 1000)
  const hasEnded = endedAt.getTime() < Date.now()

  return {
    // La fecha va en el titulo porque sin ella las fiestas semanales lo
    // repiten: 15 "CALABLAVA MORNINGS — Calablava Beach Club" identicos, y 162
    // de las 261 fichas futuras compartian titulo con otra. La URL ya las
    // distinguia, el titulo no, asi que competian entre ellas. Ademas es como
    // se busca: "calablava mornings 23 agosto".
    title: `${e.name}${venue ? ` — ${venue}` : ''}, ${formatShortDate(e.start_at, params.locale)}`,
    description,
    ...(hasEnded ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${e.name} · ${date}`,
      description,
      type: 'website',
      url: eventPath(e),
      images: imgs.length ? [{ url: imgs[0] }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    alternates: buildAlternates(eventPath(e), params.locale),
  }
}

export default async function EventDetail({ params }: { params: { locale: string; id: string } }) {
  const e: any = await fetchEvent(params.id)
  if (!e) return notFound()

  // Igual que en clubs y DJs: la URL vieja con UUID responde 308 al slug.
  if (e.slug && params.id !== e.slug) {
    permanentRedirect(localizedPath(eventPath(e), params.locale))
  }

  // A partir de aqui siempre el uuid real: el lineup, los relacionados y el
  // filtro de "mas del club" consultan por event_id, no por slug.
  const id = e.id as string
  const lineup = await fetchEventLineup(id)
  const clubId = (e as any).club_id as string | null
  // Las tres en paralelo: los relacionados dependen de datos que ya trajo
  // fetchEvent, asi que no hace falta encadenarlos y pagar otra ida y vuelta.
  // Se piden 6 para que sigan quedando 4 despues de descartar los que ya
  // salen en "Mas del club".
  const [moreFromClubRaw, club, relatedRaw] = await Promise.all([
    clubId ? fetchClubEvents(clubId, 6) : Promise.resolve([] as any[]),
    clubId ? fetchClub(clubId) : Promise.resolve(null),
    fetchRelatedEvents(id, (e as any).genres, (e as any).zone, 6),
  ])
  // fetchClubEvents no excluye el evento abierto, asi que la ficha se listaba
  // a si misma en "Mas del club". Se filtra aqui y no en la consulta porque
  // esa funcion la usan otras vistas donde el filtro no aplica.
  const moreFromClub = moreFromClubRaw.filter((ev: any) => ev.id !== id).slice(0, 5)
  const yaVisibles = new Set<string>(moreFromClub.map((ev: any) => ev.id))
  const related = relatedRaw.filter((ev: any) => !yaVisibles.has(ev.id)).slice(0, 4)
  // Muchos eventos apuntan a un club cuya ficha no es publica: /club/<id>
  // devuelve 404. Enlazarlo igualmente desde el schema mandaria a Google a una
  // URL rota, que es peor que no declarar la relacion.
  const clubHref = club ? clubPath(club as any) : null
  const clubUrl = clubHref ? `https://wherewego.site${clubHref}` : null
  const zoneSlug = (e as any).zone ? slugifyZone((e as any).zone) : null
  const imgs: string[] = Array.isArray((e as any).images) ? (e as any).images : []
  const cover = imgs.length ? imgs[0] : null
  const description: string = (e as any).description || ''
  const descriptionI18n = (e as any).description_i18n || null
  const sec = secciones(params.locale)

  const resumen = resumenEvento({
    nombre: (e as any).name,
    generos: Array.isArray((e as any).genres) ? (e as any).genres : [],
    lugar: (e as any).club_name || null,
    zona: (e as any).zone || null,
    cuando: formatEventDate((e as any).start_at, params.locale),
    lineup: lineup.map((d: any) => d.name),
    reserva: Boolean((e as any).url_referral),
  }, params.locale)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    // El evento no declaraba su propia URL: el club y los DJs si la tenian,
    // pero el MusicEvent no, asi que la unica pista de a que pagina pertenece
    // la ficha era el canonical.
    '@id': `https://wherewego.site${eventPath(e)}#event`,
    url: `https://wherewego.site${eventPath(e)}`,
    name: (e as any).name,
    startDate: (e as any).start_at,
    ...((e as any).end_at ? { endDate: (e as any).end_at } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(description ? { description: description.slice(0, 500) } : {}),
    ...(cover ? { image: [cover] } : {}),
    // El local se identifica con el @id de su ficha, no como un Place suelto.
    // Asi Google une evento y club como la misma entidad en vez de deducirlo,
    // y hereda de la ficha del club la direccion, las redes y la valoracion.
    location: clubUrl
      ? {
          '@type': 'NightClub',
          '@id': `https://wherewego.site${clubHref}#club`,
          name: (e as any).club_name || (e as any).zone || (e as any).name,
          url: clubUrl,
          ...((e as any).zone
            ? { address: { '@type': 'PostalAddress', addressLocality: (e as any).zone } }
            : {}),
        }
      : {
          '@type': 'Place',
          name: (e as any).club_name || (e as any).zone || (e as any).name,
          address: {
            '@type': 'PostalAddress',
            // Sin pais en duro: 'ES' era falso para Amsterdam.
            ...((e as any).zone ? { addressLocality: (e as any).zone } : {}),
          },
        },
    ...(lineup.length ? {
      // Person, no MusicGroup: es el mismo @id que declara la ficha del DJ, y
      // dos tipos distintos sobre el mismo identificador se contradicen.
      performer: lineup.map((d: any) => ({
        '@type': 'Person',
        '@id': `https://wherewego.site${djPath(d)}#dj`,
        name: d.name,
        url: `https://wherewego.site${djPath(d)}`,
      })),
    } : {}),
    // offers solo se declara cuando se conoce el precio: Google exige price y
    // priceCurrency dentro de todo Offer, y casi ninguna ficha tiene
    // price_min todavia. Un Offer sin precio incumplia ese requisito en casi
    // el 100% de los eventos y probablemente ya generaba errores en Search
    // Console. Sin precio, el evento sigue siendo elegible para el resultado
    // enriquecido, solo que sin el bloque de oferta.
    ...((e as any).price_min != null ? {
      offers: {
        '@type': 'Offer',
        url: `https://wherewego.site${eventPath(e)}`,
        availability: 'https://schema.org/InStock',
        price: (e as any).price_min,
        priceCurrency: 'EUR',
      },
    } : {}),
    organizer: { '@type': 'Organization', name: 'Where We Go', url: 'https://wherewego.site' },
  }

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] overflow-hidden bg-[#07060a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ── Fondo difuminado con la imagen del evento ────────────── */}
      {cover && (
        <div className="absolute inset-0 pointer-events-none">
          <SafeImage
            src={cover}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            quality={20}
            className="object-cover object-top scale-110"
            style={{ filter: 'blur(60px) brightness(0.25) saturate(1.4)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07060a]/30 via-[#07060a]/60 to-[#07060a]" />
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] max-h-[80vh]">
        {cover ? (
          <SafeImage src={cover} alt={alts(params.locale).portadaEvento((e as any).name)} fill priority sizes="100vw" className="object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#07060a]/50 to-transparent" />

        {/* Favorite */}
        <div className="absolute top-4 right-4 z-20">
          <FavoriteButton eventId={(e as any).id} useLocalCache />
        </div>

        {/* Nombre y fecha sobre el hero */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 z-10 space-y-1">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            <LocalText value={(e as any).name} i18n={(e as any).name_i18n} />
          </h1>
          <p className="text-sm text-white/70 drop-shadow">
            <LDate value={e.start_at} timeZone="UTC" options={{ weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }} />
            {' · '}
            {/* Solo se enlaza si la ficha del club es publica: mas de la mitad
                de los eventos apuntan a un club cuyo /club/<id> da 404. */}
            {clubUrl ? (
              <Link className="text-[#d8af3a] hover:text-[#e8c85a] font-medium transition-colors" href={clubHref || '/clubs'}>{e.club_name || '-'}</Link>
            ) : (e.club_name || '-')}
            {zoneSlug && (
              <>
                {' · '}
                <Link className="text-[#d8af3a] hover:text-[#e8c85a] font-medium transition-colors" href={`/${zoneSlug}`}>{(e as any).zone}</Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-4 md:px-6 lg:px-10 pb-10 space-y-5">

        {/* Jerarquia real del sitio: inicio > ciudad > club > evento. Antes
            pasaba por /discover?tab=events, que ahora es noindex, y por /clubs,
            que no es el padre de nada. */}
        <Breadcrumbs locale={params.locale} items={[
          { name: homeCrumb(params.locale), href: '/' },
          ...(zoneSlug ? [{ name: (e as any).zone as string, href: `/${zoneSlug}` }] : []),
          ...(clubHref ? [{ name: e.club_name || 'Club', href: clubHref }] : []),
          { name: (e as any).name },
        ]} />

        {/* Urgencia arriba del todo, donde se decide seguir leyendo o no. Se
            oculta solo si el evento cae a mas de 7 dias o ya empezo. */}
        <EventCountdown startAt={(e as any).start_at} />

        {/* Genres */}
        {(e as any).genres && (e as any).genres.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-1">
            {(e as any).genres.map((g: string, i: number) => (
              <Link
                key={i}
                href={`/genre/${encodeURIComponent(g)}`}
                className="text-xs px-3 py-1 rounded-full border border-[#d8af3a]/40 text-[#d8af3a]/90 bg-[#d8af3a]/8 font-medium hover:bg-[#d8af3a]/15 transition-colors"
              >
                {g}
              </Link>
            ))}
          </div>
        )}

        {/* Descripcion */}
        {description && (
          <ClubDescriptionExpand text={description} i18n={descriptionI18n} />
        )}

        {/* Respuesta corta: debajo de la descripcion, no antes. Ver la nota
            de la ficha de club. */}
        <AnswerBlock resumen={resumen} />

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Line-up */}
        <div>
          <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">{sec.eventoLineup((e as any).name)}</h2>
          {lineup.length === 0 ? (
            <p className="text-sm text-white/40">-</p>
          ) : (
            <div className="space-y-3">
              {lineup.map(d => {
                const embed = getSpotifyEmbed((d as any).spotify_embed)
                const djImgs: string[] = Array.isArray((d as any).images) ? (d as any).images : []
                const djImg = djImgs[0] || null
                return (
                  <div key={d.id} className="space-y-2">
                    <Link
                      href={djPath(d)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 hover:border-[#d8af3a]/30 transition-all group"
                    >
                      {djImg ? (
                        <SafeImage src={djImg} alt={alts(params.locale).miniDj((d as any).name)} width={56} height={56} sizes="56px" className="w-14 h-14 rounded-full object-cover object-top border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/8 border border-white/10 shrink-0 flex items-center justify-center text-white/20 text-xl">♪</div>
                      )}
                      <p className="flex-1 font-medium text-white group-hover:text-[#d8af3a] transition-colors">
                        <LocalText value={d.name} i18n={(d as any).name_i18n || undefined} />
                      </p>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-[#d8af3a] shrink-0 transition-colors">
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                    {embed && (
                      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/30">
                        <iframe
                          src={embed.src}
                          title="Spotify player"
                          width="100%"
                          height={embed.height}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="block w-full"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          {(e as any).url_referral ? (
            <ReserveButton
              eventId={(e as any).id}
              source="details"
              className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-sm shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all"
            >
              <T k="action.reserve_tickets" />
            </ReserveButton>
          ) : (
            <span className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-sm text-center cursor-not-allowed"><T k="event.no_reservations" /></span>
          )}
          <Link
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm text-center hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
            href={`https://maps.google.com?q=${encodeURIComponent([(e as any).club_name, (e as any).zone].filter(Boolean).join(', ') || (e as any).name)}`}
            target="_blank"
          >
            <T k="action.directions" />
          </Link>
        </div>

        {/* Share */}
        <ShareSheet
          title={(e as any).name}
          i18n={(e as any).name_i18n || undefined}
          buttonClassName="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all"
        />

        {/* Mas del club */}
        {moreFromClub.length > 0 && (
          <>
            <div className="border-t border-white/8" />
            <div>
              <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">{sec.eventoMasDelClub(e.club_name)}</h2>
              <div className="space-y-2">
                {moreFromClub.map((ev: any) => (
                  <EventRow key={ev.id} ev={ev} locale={params.locale} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Te puede interesar: evita el callejon sin salida cuando el evento no
            convence. fetchRelatedEvents va en cascada (mismo genero, misma
            zona, y si no cualquiera proximo), asi que casi siempre trae algo,
            tambien en eventos sin club. */}
        {related.length > 0 && (
          <>
            <div className="border-t border-white/8" />
            <div>
              <h2 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">{sec.eventoRelacionados('')}</h2>
              <div className="space-y-2">
                {related.map((ev: any) => (
                  <EventRow key={ev.id} ev={ev} locale={params.locale} showVenue />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-white/30">ID: {id}</div>
      </div>
    </div>
  )
}

export const revalidate = 60
