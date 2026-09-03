"use client"
import { FormEvent, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, Link } from '@/lib/navigation'
import { useI18n } from '@/lib/i18n'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { fetchKnownZones, normalizeZoneKey } from '@/lib/zones-client'
import { geocodeCandidates, haversineKm, reverseGeocode, suggestCities, type Coords } from '@/lib/geo-client'
import { zoneCoords } from '@/lib/zone-coords'
import { GradientBackground } from '@/components/ui/gradient-background'

// Carga diferida y sin SSR: es WebGL puro (ogl), no tiene sentido renderizarlo
// en el servidor, y así no entra en el bundle que bloquea el primer pintado.
const Strands = dynamic(() => import('@/components/ui/Strands'), { ssr: false })

const STRANDS_COLORS = ['#d8af3a', '#f5d98b', '#8a6a1e']

// Mismo look que landing-gold-base/aurora (fondo casi negro con brillos ambar)
// pero como gradientes solidos que el componente cruza con transicion suave.
// Manteniendo el tono oscuro de base la legibilidad del texto blanco/dorado
// encima no cambia respecto al fondo anterior.
// El buscador ocupa exactamente una pantalla: la ventana menos la barra de
// navegacion. Debajo ya no hay segunda zona, solo el pie del sitio.
const SECTION_HEIGHT = 'calc(100dvh - 64px)'

const WWG_HERO_GRADIENTS = [
  'linear-gradient(135deg, #07060a 0%, #2b1d05 100%)',
  'linear-gradient(135deg, #120d02 0%, #3d2c0a 100%)',
  'linear-gradient(135deg, #07060a 0%, #4a3410 100%)',
  'linear-gradient(135deg, #1a1206 0%, #07060a 100%)',
  'linear-gradient(135deg, #07060a 0%, #2b1d05 100%)',
]

type GeoStatus = 'idle' | 'locating' | 'success' | 'error'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts. Esta es la
// home, la pagina de mas trafico del sitio: crear uno nuevo aqui (y sin
// storageKey, con clave por defecto distinta de 'nighthub-auth') era de los
// puntos que mas pesaba en la fuga.
function sb() {
  return supabaseBrowser
}


// Semilla hasta que llegan las zonas reales de la base de datos. Antes anunciaba
// Ibiza, Barcelona y Madrid, donde no hay agenda, y omitia Valencia, que es la
// ciudad con mas eventos.
const SEED_CITIES = ['Valencia', 'Mallorca', 'Castellón', 'Amsterdam']

// Elige la pareja candidato-zona mas cercana, con una condicion: prefiere
// candidatos y zonas del mismo tipo de terreno (isla con isla, peninsula con
// peninsula). Buscando desde Barcelona, Mallorca queda mas cerca en linea
// recta que Castellon, pero cruzar el mar no es "lo mas cercano" razonable
// para alguien en la peninsula. Solo se cruza si de verdad no hay ninguna
// zona del mismo tipo (mejor ofrecer algo que nada).
function pickNearestZone<T extends Coords>(
  targets: T[],
  zones: { label: string; coords: Coords }[],
): { target: T; zoneLabel: string } | null {
  let bestSameTerrain: { target: T; zoneLabel: string; km: number } | null = null
  let bestAny: { target: T; zoneLabel: string; km: number } | null = null
  for (const target of targets) {
    for (const zone of zones) {
      const km = haversineKm(target, zone.coords)
      if (!bestAny || km < bestAny.km) bestAny = { target, zoneLabel: zone.label, km }
      const sameTerrain = !!target.island === !!zone.coords.island
      if (sameTerrain && (!bestSameTerrain || km < bestSameTerrain.km)) {
        bestSameTerrain = { target, zoneLabel: zone.label, km }
      }
    }
  }
  const winner = bestSameTerrain || bestAny
  return winner ? { target: winner.target, zoneLabel: winner.zoneLabel } : null
}

export function LandingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [zone, setZone] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [knownZones, setKnownZones] = useState<string[]>(SEED_CITIES)
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const [showStrands, setShowStrands] = useState(false)
  // Ciudad que el usuario esta escribiendo (resuelta a nombre completo) y la
  // zona con agenda que le queda mas cerca. Se guarda junto al texto que lo
  // genero para no enseñarlo pegado a una busqueda que ya ha cambiado.
  const [nearestHint, setNearestHint] = useState<{ typed: string; city: string; zone: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detectar soporte de Speech API
  useEffect(() => {
    setHasSpeech(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
  }, [])

  // El fondo animado (WebGL) no se monta si el usuario pide menos movimiento.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setShowStrands(!reduced)
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

  const normalizeZone = (raw: string) => {
    const cleaned = raw.trim()
    const lc = cleaned.toLowerCase()
    if (lc === 'palma' || (lc.startsWith('palma') && !lc.includes('mallorca'))) return 'Palma de Mallorca'
    if (lc === 'palma de mallorca') return 'Palma de Mallorca'
    return cleaned
  }

  // Zonas con agenda que empiezan por lo que lleva escrito. Estaba repetido en
  // onChange y onFocus; ahora lo usa ademas el efecto de sugerencia cercana.
  const matchingZones = (raw: string) => {
    const norm = normalizeZone(raw)
    if (norm.length < 2) return []
    const key = normalizeZoneKey(norm)
    return knownZones.filter((z) => normalizeZoneKey(z).startsWith(key)).slice(0, 5)
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

  // Si lo escrito no es una de nuestras ciudades, se completa el nombre y se
  // ofrece la zona con agenda mas cercana. Asi "madri" deja de no sugerir nada:
  // se resuelve a Madrid y se propone Valencia, que es lo mas cerca que
  // tenemos.
  //
  // Con espera de 400ms y a partir de 3 letras para no preguntar en cada
  // pulsacion. Las respuestas van cacheadas en la CDN, pero no hace falta
  // preguntar por "ma", "mad" y "madr" para acabar preguntando por "madri".
  useEffect(() => {
    const typed = normalizeZone(zone)
    if (typed.length < 3 || matchingZones(typed).length > 0) {
      setNearestHint(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const [cities, coords] = await Promise.all([suggestCities(typed), zoneCoords()])
      // Sin la guarda, una respuesta lenta de una busqueda vieja pisaria la
      // sugerencia de lo que el usuario esta escribiendo ahora.
      if (cancelled || !cities.length) return

      // La ciudad la elige el buscador, que ordena por relevancia; nosotros
      // solo desempatamos entre las que se llaman igual. Ordenando por
      // distancia tambien la ciudad, "madri" proponia Madridejos: esta mas
      // cerca de Valencia que Madrid, pero no es lo que se estaba escribiendo.
      const topName = normalizeZoneKey(cities[0].name)
      const homonyms = cities.filter((c) => normalizeZoneKey(c.name) === topName)

      // Entre los homonimos gana el que quede mas cerca de alguna zona nuestra:
      // "Madrid" existe en España, en Iowa y en Colombia, y solo el español
      // esta a un rato de Valencia. Y entre las zonas, se prefiere una del
      // mismo tipo de terreno que lo buscado (ver pickNearestZone).
      const zonesWithCoords = knownZones
        .map((label) => ({ label, coords: coords.get(normalizeZoneKey(label)) }))
        .filter((z): z is { label: string; coords: Coords } => !!z.coords)
      const winner = pickNearestZone(homonyms, zonesWithCoords)
      if (!winner) return
      setNearestHint({ typed, city: winner.target.label, zone: winner.zoneLabel })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, knownZones])

  // Zona con agenda mas cercana a lo que ha escrito el usuario. Devuelve la
  // etiqueta tal cual esta en la base de datos, o null si no se puede situar
  // el sitio o ninguna zona resuelve coordenadas.
  //
  // Recibe las etiquetas de zona y no el mapa de recuentos porque lo usan dos
  // sitios: el envio del formulario (que ya tiene los recuentos) y el
  // desplegable de sugerencias (que solo tiene la lista de zonas conocidas).
  async function nearestZoneTo(zoneName: string, labels: string[]): Promise<string | null> {
    const [targets, coords] = await Promise.all([geocodeCandidates(zoneName), zoneCoords()])
    if (!targets.length) return null

    // Se cruzan todos los candidatos del geocoder con todas las zonas y gana la
    // pareja mas cercana del mismo tipo de terreno (ver pickNearestZone). Esto
    // resuelve de paso la ambiguedad de nombres: para "Deia" el candidato
    // rumano queda a 1500 km de cualquier zona y el mallorquin a 25 km de
    // Mallorca, asi que gana el correcto.
    const zonesWithCoords = labels
      .map((label) => ({ label, coords: coords.get(normalizeZoneKey(label)) }))
      .filter((z): z is { label: string; coords: Coords } => !!z.coords)
    const winner = pickNearestZone(targets, zonesWithCoords)
    return winner ? winner.zoneLabel : null
  }

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

    // Sin agenda en lo que ha pedido: se ofrece la zona mas CERCANA, no la que
    // mas eventos tiene. Buscando "Soller" salia Valencia por volumen, cuando
    // Soller esta en Mallorca a 25 km y Valencia a 265 km cruzando el mar.
    const nearest = await nearestZoneTo(zoneName, Array.from(labelByKey.values()))
    if (nearest) return { zone: nearest, fallback: nearest, hasEvents: false }

    // Si la geocodificacion falla (sin red, Nominatim caido, sitio inexistente)
    // se vuelve al criterio antiguo: mejor la zona con mas agenda que nada.
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

  type Resolved = { zone: string; fallback: string | null; hasEvents: boolean }

  // Aviso al usuario y navegacion. Separado de goToDiscover porque la
  // sugerencia del desplegable ya trae la zona resuelta y volver a resolverla
  // seria pedir lo mismo otra vez.
  function announceAndGo(typedName: string, resolved: Resolved) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nighthub-zone', resolved.zone)
      if (!resolved.hasEvents) {
        const msg = resolved.fallback
          ? t('landing.no_events_fallback')
              .replace('{zone}', typedName)
              .replace('{fallback}', resolved.fallback)
          : t('landing.no_events')
        window.dispatchEvent(new CustomEvent('nighthub-toast', { detail: { message: msg } }))
      }
    }
    router.push(`/discover?tab=events&zone=${encodeURIComponent(resolved.zone)}`)
  }

  // Salto directo a la zona que propone el desplegable, sin volver a
  // geocodificar. Importa ademas por correccion: lo escrito puede estar a
  // medias ("madri"), y el geocodificador de nombres completos lo resolveria
  // como un sitio cualquiera del mundo que se llame asi.
  function goToNearest(hint: { city: string; zone: string }) {
    announceAndGo(hint.city, { zone: hint.zone, fallback: hint.zone, hasEvents: false })
  }

  async function goToDiscover(targetZone: string) {
    const cleaned = normalizeZone(targetZone)
    if (!cleaned) {
      setStatusMsg(t('landing.error_empty'))
      return
    }
    announceAndGo(cleaned, await resolveZoneWithFallback(cleaned))
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
    // Si el desplegable ya ha resuelto lo que hay escrito, se usa. Enviando
    // "madri" sin esto se resolveria por nombre completo, que para un texto a
    // medias devuelve cualquier sitio del mundo que se llame asi.
    if (nearestHint && nearestHint.typed === normalizeZone(zone)) {
      goToNearest(nearestHint)
      return
    }
    await goToDiscover(zone)
  }

  return (
    <div id="landing-bg" className="relative -mx-4 md:-mx-6 lg:-mx-10 -mt-3 md:-mt-6 -mb-3 md:-mb-6 px-4 md:px-6 lg:px-10 overflow-hidden rounded-[28px] border border-[#d8af3a]/10 bg-[#07060a]">
      {/* El fondo cubre las dos zonas de una pieza, para que al deslizar el
          degradado siga sin corte. No va sticky porque este contenedor recorta
          con overflow, y eso deja clavado cualquier hijo sticky. Sin particulas:
          el canvas de tsparticles penalizaba el Speed Index en PageSpeed. */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <GradientBackground
          gradients={WWG_HERO_GRADIENTS}
          animationDuration={10}
          animationDelay={0.3}
          className="absolute inset-0 min-h-0 pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none landing-gold-vignette" />
        {showStrands && (
          <div className="absolute inset-0">
            <Strands
              colors={STRANDS_COLORS}
              count={3}
              speed={0.4}
              amplitude={1}
              waviness={1}
              thickness={0.5}
              glow={1.4}
              taper={3}
              spread={1}
              intensity={0.35}
              saturation={1}
              opacity={0.22}
              scale={1.5}
            />
          </div>
        )}
      </div>

      {/* Unica zona: identidad y buscador, sin nada mas que distraiga. */}
      <section
        className="relative z-10 flex flex-col items-center justify-center text-center gap-4 md:gap-6"
        style={{ height: SECTION_HEIGHT }}
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
          {/* z-20 aqui y no solo en el desplegable: .anim-form y .anim-points
              acaban con transform, y cada transform crea su propio contexto de
              apilado, asi que un z-index de dentro no puede pasar por encima
              del bloque hermano. */}
          <div className="relative z-20 anim-form">
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
                setSuggestions(matchingZones(val))
              }}
              onBlur={() => {
                setZone(prev => normalizeZone(prev))
                setTimeout(() => { setSuggestions([]); setNearestHint(null) }, 120)
              }}
              onFocus={() => {
                setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                setSuggestions(matchingZones(zone))
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
              {/* Antes iba envuelto en GlowingShadow: animaba un filter:blur()
                  infinito via CSS custom properties, muy pesado en moviles de
                  gama baja. El brillo estatico de abajo mas el pulso ligero de
                  cta-arrow (solo transform) dan presencia sin ese coste. */}
              <button
                type="submit"
                className="w-12 h-12 rounded-full bg-gold text-black hover:opacity-90 transition active:scale-95 flex items-center justify-center shadow-[0_0_24px_rgba(216,175,58,0.35)] cta-arrow"
                aria-label={t('landing.cta')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            </div>
            {/* z-20 y fondo opaco: el desplegable es absoluto pero el boton de
                ubicacion viene despues en el DOM y se pintaba encima. */}
            {(suggestions.length > 0 || nearestHint) && (
              <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl bg-[#0b0910] border border-white/10 shadow-glow text-left text-sm overflow-hidden">
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
                {/* Solo cuando no hay coincidencia directa: la ciudad escrita no
                    es nuestra, asi que se dice cual se abre y por que. */}
                {suggestions.length === 0 && nearestHint && (
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-white/5"
                    onMouseDown={(e)=>e.preventDefault()}
                    onClick={() => { setNearestHint(null); goToNearest(nearestHint) }}
                  >
                    <span className="text-white">{nearestHint.city}</span>
                    <span className="block text-xs text-white/45">
                      {t('landing.suggest_nearest').replace('{zone}', nearestHint.zone)}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 anim-points pt-1">
            <button
              type="button"
              onClick={() => requestGeo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition text-sm text-white/80"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#8dd0ff] shadow-[0_0_10px_rgba(141,208,255,0.8)]" />
              {geoStatus === 'locating' ? t('landing.using_location') : t('landing.use_location')}
            </button>

            <Link
              href="/map"
              prefetch={false}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 hover:border-gold hover:bg-gold/20 transition text-sm font-semibold text-gold shadow-[0_0_16px_rgba(216,175,58,0.2)]"
            >
              <span>{t('nav.map')}</span>
            </Link>

            {statusMsg && <div className="w-full text-xs text-white/60 text-center">{statusMsg}</div>}
          </div>
        </form>
      </section>
    </div>
  )
}
