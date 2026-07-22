"use client"
import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@/lib/navigation'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@supabase/supabase-js'
import { fetchKnownZones, normalizeZoneKey } from '@/lib/zones-client'
import { reverseGeocode } from '@/lib/geo-client'
import { whenMeta, whenSlug, WHEN_KEYS } from '@/lib/seo-pages'
import { GradientBackground } from '@/components/ui/gradient-background'
import { GlowingShadow } from '@/components/ui/glowing-shadow'
import { SafeImage } from '@/components/SafeImage'
import { SparklesCore } from '@/components/ui/sparkles'
import { NumberTicker } from '@/components/ui/number-ticker'

// Mismo look que landing-gold-base/aurora (fondo casi negro con brillos ambar)
// pero como gradientes solidos que el componente cruza con transicion suave.
// Manteniendo el tono oscuro de base la legibilidad del texto blanco/dorado
// encima no cambia respecto al fondo anterior.
// Alto de cada zona: la ventana menos la barra de navegacion, para que la
// siguiente asome solo al deslizar y no a medias.
const SECTION_HEIGHT = 'calc(100dvh - 64px)'

const WWG_HERO_GRADIENTS = [
  'linear-gradient(135deg, #07060a 0%, #2b1d05 100%)',
  'linear-gradient(135deg, #120d02 0%, #3d2c0a 100%)',
  'linear-gradient(135deg, #07060a 0%, #4a3410 100%)',
  'linear-gradient(135deg, #1a1206 0%, #07060a 100%)',
  'linear-gradient(135deg, #07060a 0%, #2b1d05 100%)',
]

type GeoStatus = 'idle' | 'locating' | 'success' | 'error'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


// Semilla hasta que llegan las zonas reales de la base de datos. Antes anunciaba
// Ibiza, Barcelona y Madrid, donde no hay agenda, y omitia Valencia, que es la
// ciudad con mas eventos.
const SEED_CITIES = ['Valencia', 'Mallorca', 'Castellón', 'Amsterdam']

type PreviewClub = { id: string; name: string; genres: string[]; address: string | null }
type City = { slug: string; name: string }
// Fecha corta y en el idioma de la pagina: "vie 24 jul, 23:00". El servidor y
// el cliente formatean con la misma zona horaria fija para que no cambie el
// texto en la hidratacion.
function formatEventDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

type Stats = { events: number; clubs: number; cities: number }
type NextEvent = {
  id: string
  name: string
  start_at: string
  club_name: string | null
  image: string | null
}

export function LandingPage({
  cities = [],
  locale = 'es',
  stats,
  events = [],
}: {
  cities?: City[]
  locale?: string
  stats?: Stats
  events?: NextEvent[]
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [zone, setZone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [knownZones, setKnownZones] = useState<string[]>(SEED_CITIES)
  const [previewClubs, setPreviewClubs] = useState<PreviewClub[]>([])
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detectar soporte de Speech API
  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  }, [])

  // La portada pasa a tener dos zonas de pantalla completa, asi que ya no
  // bloquea el scroll: lo guia. Con 'proximity' el navegador solo ayuda a
  // encajar la zona cuando el gesto se queda cerca, y no secuestra el scroll
  // hacia el pie ni en teclado ni en movil.
  useEffect(() => {
    const html = document.documentElement
    html.style.scrollSnapType = 'y proximity'
    html.style.scrollBehavior = 'smooth'
    return () => {
      html.style.scrollSnapType = ''
      html.style.scrollBehavior = ''
    }
  }, [])

  // Animación de typing en el placeholder
  useEffect(() => {
    // Se anima con las ciudades que realmente tienen agenda, asi el placeholder
    // se actualiza solo cuando se abre una ciudad nueva.
    const cities = knownZones.length ? knownZones : SEED_CITIES
    let cityIdx = 0
    let charIdx = 0
    let deleting = false
    let timeout: ReturnType<typeof setTimeout>

    function tick() {
      const city = cities[cityIdx]
      if (!deleting) {
        charIdx++
        setDisplayPlaceholder(city.slice(0, charIdx))
        if (charIdx === city.length) {
          deleting = true
          timeout = setTimeout(tick, 1400) // pausa antes de borrar
          return
        }
      } else {
        charIdx--
        setDisplayPlaceholder(city.slice(0, charIdx))
        if (charIdx === 0) {
          deleting = false
          cityIdx = (cityIdx + 1) % cities.length
        }
      }
      timeout = setTimeout(tick, deleting ? 40 : 65)
    }
    timeout = setTimeout(tick, 600)
    return () => clearTimeout(timeout)
  }, [knownZones])

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1
    setIsListening(true)
    rec.start()
    rec.onresult = (e: any) => {
      const spoken = e.results[0][0].transcript
      setZone(spoken)
      setIsListening(false)
      goToDiscover(spoken)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data: featured } = await sb()
          .from('clubs')
          .select('id, name, genres, address')
          .eq('status', 'approved')
          .eq('featured', true)
          .limit(3)
        if (featured?.length) {
          setPreviewClubs(featured as PreviewClub[])
          return
        }
        const { data: fallback } = await sb()
          .from('clubs')
          .select('id, name, genres, address')
          .eq('status', 'approved')
          .limit(3)
        if (fallback?.length) setPreviewClubs(fallback as PreviewClub[])
      } catch {}
    })()
  }, [])

  const normalizeZone = (raw: string) => {
    const cleaned = raw.trim()
    const lc = cleaned.toLowerCase()
    if (lc === 'palma' || (lc.startsWith('palma') && !lc.includes('mallorca'))) return 'Palma de Mallorca'
    if (lc === 'palma de mallorca') return 'Palma de Mallorca'
    return cleaned
  }

  useEffect(() => {
    // Precargar la ultima zona usada para que el usuario pueda lanzar rapido
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nighthub-zone') || ''
      if (saved) setZone(saved)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const zones = await fetchKnownZones()
        if (!zones.length) return
        setKnownZones((prev) => Array.from(new Set([...prev, ...zones])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
      } catch {}
    })()
  }, [])

  async function resolveZoneWithFallback(zoneName: string) {
    const client = sb()
    const nowIso = new Date().toISOString()
    const [eventsRes, clubsRes] = await Promise.all([
      client.from('events_public').select('zone').gte('start_at', nowIso).not('zone', 'is', null).limit(1000),
      client.from('clubs').select('zone').eq('status', 'approved').not('zone', 'is', null).limit(1000),
    ])

    const eventZoneError = String((eventsRes.error as any)?.message || '').toLowerCase()
    const clubZoneError = String((clubsRes.error as any)?.message || '').toLowerCase()

    if ((eventsRes.error && !eventZoneError.includes('zone')) || (clubsRes.error && !clubZoneError.includes('zone'))) {
      return { zone: zoneName, fallback: null, hasEvents: false }
    }

    const counts = new Map<string, number>()
    const labelByKey = new Map<string, string>()
    const allRows = [
      ...((eventsRes.data || []) as any[]),
      ...((clubsRes.data || []) as any[]),
    ]

    for (const row of allRows) {
      const z = (row.zone || '').toString().trim()
      if (!z) continue
      const key = normalizeZoneKey(z)
      if (!key) continue
      const next = (counts.get(key) || 0) + 1
      counts.set(key, next)
      if (!labelByKey.has(key)) labelByKey.set(key, z)
    }

    const inputKey = normalizeZoneKey(zoneName)
    const inputCount = counts.get(inputKey) || 0
    if (inputCount > 0) {
      return { zone: labelByKey.get(inputKey) || zoneName, fallback: null, hasEvents: true }
    }

    let bestKey = ''
    let bestCount = 0
    for (const [key, count] of counts.entries()) {
      if (count > bestCount) {
        bestCount = count
        bestKey = key
      }
    }
    if (bestKey) {
      const fallback = labelByKey.get(bestKey) || zoneName
      return { zone: fallback, fallback, hasEvents: false }
    }
    return { zone: zoneName, fallback: null, hasEvents: false }
  }

  async function goToDiscover(targetZone: string) {
    const cleaned = normalizeZone(targetZone)
    if (!cleaned) {
      setStatusMsg(t('landing.error_empty'))
      return
    }
    const resolved = await resolveZoneWithFallback(cleaned)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nighthub-zone', resolved.zone)
      if (!resolved.hasEvents) {
        const msg = resolved.fallback
          ? t('landing.no_events_fallback')
              .replace('{zone}', cleaned)
              .replace('{fallback}', resolved.fallback)
          : t('landing.no_events')
        window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message: msg } }))
      }
    }
    router.push(`/discover?tab=events&zone=${encodeURIComponent(resolved.zone)}`)
  }

  async function requestGeo(autoNavigate = false) {
    if (geoStatus === 'locating') return
    if (!navigator.geolocation) {
      setGeoStatus('error')
      setStatusMsg(t('landing.geo_not_supported'))
      return
    }
    setGeoStatus('locating')
    setStatusMsg(autoNavigate ? t('landing.locating_auto') : t('landing.locating'))
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      const name = await reverseGeocode(latitude, longitude)
      const fallback = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      const resolved = name || fallback
      setZone(resolved)
      setGeoStatus('success')
      setStatusMsg(name ? t('landing.located') : t('landing.located_fallback'))
      if (autoNavigate) await goToDiscover(resolved)
    }, (err) => {
      console.error('geolocation error', err)
      setGeoStatus('error')
      setStatusMsg(t('landing.geo_denied'))
    }, { enableHighAccuracy: false, timeout: 8000 })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await goToDiscover(zone)
  }

  return (
    <div id="landing-bg" className="relative -mx-4 md:-mx-6 lg:-mx-10 -mt-3 md:-mt-6 -mb-3 md:-mb-6 px-4 md:px-6 lg:px-10 overflow-hidden rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      {/* El fondo cubre las dos zonas de una pieza, para que al deslizar el
          degradado siga sin corte. No va sticky porque este contenedor recorta
          con overflow, y eso deja clavado cualquier hijo sticky. La densidad de
          particulas baja a la mitad porque el area es el doble. */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <GradientBackground
          gradients={WWG_HERO_GRADIENTS}
          animationDuration={10}
          animationDelay={0.3}
          className="absolute inset-0 min-h-0 pointer-events-none"
        />
        {/* Polvo dorado por encima del gradiente y por debajo del contenido.
            Densidad baja a proposito: el hero ya tiene un fondo en movimiento y
            la idea es sugerir ambiente, no competir con el buscador. */}
        <SparklesCore
          id="wwg-hero-sparkles"
          className="absolute inset-0 pointer-events-none"
          background="transparent"
          particleColor="#d8af3a"
          particleDensity={28}
          minSize={0.4}
          maxSize={1.2}
          speed={1.5}
        />
        <div className="absolute inset-0 pointer-events-none landing-gold-vignette" />
      </div>

      {/* Zona 1: identidad y buscador, sin nada mas que distraiga. */}
      <section
        className="relative z-10 flex flex-col items-center justify-center text-center gap-4 md:gap-6"
        style={{ minHeight: SECTION_HEIGHT, scrollSnapAlign: 'start' }}
      >
        {/* Icono — entra con scale */}
        <div className="anim-icon flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#d8af3a]/10 border border-[#d8af3a]/25 flex items-center justify-center shadow-[0_0_32px_rgba(216,175,58,0.25)]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="13" r="5" stroke="#d8af3a" strokeWidth="2"/>
              <path d="M16 32 C16 32 6 20 6 13 C6 7.477 10.477 3 16 3 C21.523 3 26 7.477 26 13 C26 20 16 32 16 32Z" stroke="#d8af3a" strokeWidth="2" fill="none"/>
              <circle cx="16" cy="13" r="2" fill="#d8af3a"/>
            </svg>
          </div>
        </div>
        {/* Nombre — sube justo despues del icono */}
        <div className="anim-logo -mt-2 text-center">
          <div className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 text-transparent bg-clip-text drop-shadow-[0_12px_45px_rgba(0,0,0,0.35)] wwg-gold-sheen">
            WWG
          </div>
          <div className="mt-3 text-lg md:text-xl font-medium tracking-[0.35em] text-white/80 wwg-neon">WHERE WE GO</div>
        </div>
        {/* Subtitulo, y unico h1 de la pagina. "WWG"/"WHERE WE GO" de arriba son
            el logotipo, no contenido: la portada no tenia ningun h1, y el
            titulo visual no describe de que trata el sitio. */}
        <h1 className="anim-subtitle text-base md:text-lg font-normal text-white/55 max-w-sm -mt-2">
          {t('landing.subtitle')}
        </h1>
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-2">
          {/* Ya era el texto que presentaba el buscador; solo cambia la
              etiqueta, de p a h2, para que la pagina tenga una jerarquia real
              bajo el h1 en vez de saltar directo a contenido sin encabezado. */}
          <h2 className="text-sm font-normal text-white/50 text-center anim-label">{t('landing.placeholder')}</h2>
          <div className="relative anim-form">
            <div className="flex items-center bg-black/30 border border-[#d8af3a]/30 rounded-full px-5 py-2 shadow-[0_0_28px_rgba(216,175,58,0.18),0_15px_60px_rgba(0,0,0,0.45)] backdrop-blur transition-shadow hover:shadow-[0_0_42px_rgba(216,175,58,0.32),0_15px_60px_rgba(0,0,0,0.45)]">
            <svg className="w-4 h-4 text-[#d8af3a] mr-3 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 16 C7 16 2 10 2 6 C2 3.24 4.24 1 7 1 C9.76 1 12 3.24 12 6 C12 10 7 16 7 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            {/* min-w-0: sin esto el input no baja del ancho de su placeholder
                (min-width:auto por defecto en un item flex) y en movil empuja
                el boton de buscar fuera de la barra. */}
            <input
              ref={inputRef}
              className="flex-1 min-w-0 bg-transparent outline-none text-white py-3 text-base md:text-lg placeholder:text-white/35"
              placeholder={displayPlaceholder}
              value={zone}
              onChange={(e) => {
                const val = e.target.value
                setZone(val)
                const norm = normalizeZone(val)
                const matches = knownZones.filter(z => normalizeZoneKey(z).startsWith(normalizeZoneKey(norm)) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
              onBlur={() => {
                setZone(prev => normalizeZone(prev))
                setTimeout(() => setSuggestions([]), 120)
              }}
              onFocus={() => {
                setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                const norm = normalizeZone(zone)
                const matches = knownZones.filter(z => normalizeZoneKey(z).startsWith(normalizeZoneKey(norm)) && norm.length >= 2)
                setSuggestions(matches.slice(0, 5))
              }}
            />
            {hasSpeech && (
              <button
                type="button"
                onClick={startVoice}
                aria-label="Buscar por voz"
                className={`ml-1 w-10 h-10 rounded-full flex items-center justify-center transition ${isListening ? 'bg-red-500/80 shadow-[0_0_16px_rgba(255,60,60,0.6)]' : 'bg-white/8 hover:bg-white/12'}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M2.5 8.5A5.5 5.5 0 008 14a5.5 5.5 0 005.5-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <div className="ml-2 shrink-0">
              <GlowingShadow width="72px" aspectRatio="1/1" radius="999px" contentColor="transparent">
                <button
                  type="submit"
                  className="w-12 h-12 rounded-full bg-gold text-black hover:opacity-90 transition active:scale-95 flex items-center justify-center shadow-[0_0_24px_rgba(216,175,58,0.35)] cta-arrow"
                  aria-label={t('landing.cta')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </GlowingShadow>
            </div>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-black/70 border border-white/10 backdrop-blur shadow-glow text-left text-sm overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-white/5"
                    onMouseDown={(e)=>e.preventDefault()}
                    onClick={() => { setZone(s); setSuggestions([]); goToDiscover(s) }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 anim-points">
            <button
              type="button"
              onClick={() => requestGeo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition text-sm text-white/80"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#8dd0ff] shadow-[0_0_10px_rgba(141,208,255,0.8)]" />
              {geoStatus === 'locating' ? t('landing.using_location') : t('landing.use_location')}
            </button>
            {statusMsg && <div className="text-xs text-white/60">{statusMsg}</div>}
          </div>
        </form>

        {/* Sin esto la segunda zona no se anuncia: la portada cabia en una
            pantalla y nadie tenia motivo para deslizar. */}
        <button
          type="button"
          onClick={() => document.getElementById('landing-zona-2')?.scrollIntoView({ behavior: 'smooth' })}
          className="anim-points absolute bottom-6 inline-flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-white/30 hover:text-[#d8af3a] transition"
        >
          {t('landing.scroll_hint')}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* Zona 2: a donde ir. Todo lo que antes se apretaba bajo el buscador
          vive aqui, con sitio y con encabezado propio. */}
      <section
        id="landing-zona-2"
        className="relative z-10 flex flex-col items-center justify-center text-center gap-8 md:gap-10"
        style={{ minHeight: SECTION_HEIGHT, scrollSnapAlign: 'start' }}
      >
        {/* Enlaces reales, ya en el HTML: la portada es la pagina con mas
            autoridad del sitio y antes no enlazaba ni una ciudad ni una fecha,
            solo alcanzables escribiendo en el buscador (JS, no rastreable). */}
        {cities.length > 0 && (
          <div className="w-full max-w-sm">
            <h2 className="text-xs font-normal uppercase tracking-[0.2em] text-white/35 mb-3">
              {t('landing.explore_cities')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {cities.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}/${whenSlug('today', locale)}`}
                  prefetch={false}
                  className="px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition text-xs text-white/70 text-center truncate"
                >
                  {whenMeta('today', c.name, locale).eyebrow} · {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cifras reales de la agenda. Ademas de dar contexto de tamano al
            visitante, mete dos enlaces internos mas hacia /discover y /clubs,
            que hasta ahora solo colgaban del pie. */}
        {stats && stats.events > 0 && (
          <div className="anim-points flex items-center gap-4 text-xs text-white/45">
            <Link href="/discover" prefetch={false} className="hover:text-[#d8af3a] transition">
              <NumberTicker target={stats.events} className="text-[#d8af3a] font-semibold tabular-nums" />{' '}
              {t('landing.stats_events')}
            </Link>
            <span aria-hidden="true" className="text-white/20">·</span>
            <Link href="/clubs" prefetch={false} className="hover:text-[#d8af3a] transition">
              <NumberTicker target={stats.clubs} className="text-[#d8af3a] font-semibold tabular-nums" />{' '}
              {t('landing.stats_clubs')}
            </Link>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>
              <NumberTicker target={stats.cities} className="text-[#d8af3a] font-semibold tabular-nums" />{' '}
              {t('landing.stats_cities')}
            </span>
          </div>
        )}

        {/* Los tres planes mas proximos, con enlace a su ficha. Ocupan la banda
            inferior, que estaba vacia, y son los primeros enlaces de la portada
            hacia eventos concretos: antes solo se llegaba desde /discover. */}
        {events.length > 0 && (
          <div className="w-full max-w-3xl">
            <h2 className="text-xs font-normal uppercase tracking-[0.2em] text-white/35 mb-3">
              {t('landing.next_events')}
            </h2>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/event/${e.id}`}
                  prefetch={false}
                  className="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#d8af3a]/40 transition text-left"
                >
                  {/* Cartel en vertical, que es como llegan los flyers de los
                      clubs. La fecha y el nombre van encima de la imagen, sobre
                      un degradado, para que la ficha sea sobre todo el cartel. */}
                  <div className="relative aspect-[3/4] bg-white/5">
                    {e.image ? (
                      <SafeImage
                        src={e.image}
                        alt={e.name}
                        fill
                        sizes="(max-width: 768px) 33vw, 220px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl text-white/15">
                        ♪
                      </div>
                    )}
                    {/* Degradado opaco: hay carteles casi blancos y la fecha
                        dorada encima se volvia ilegible. */}
                    <div className="absolute inset-x-0 bottom-0 p-2 md:p-3 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <div className="text-[10px] md:text-[11px] text-[#d8af3a] tabular-nums truncate">
                        {formatEventDate(e.start_at, locale)}
                      </div>
                      <div className="text-xs md:text-sm font-medium text-white truncate group-hover:text-[#d8af3a] transition">
                        {e.name}
                      </div>
                      {e.club_name && (
                        <div className="text-[10px] md:text-[11px] text-white/50 truncate">{e.club_name}</div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
