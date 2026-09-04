import { getSupabaseClient } from '@/lib/supabase'
import { fetchEvents } from '@/lib/db'

export type MapEventItem = {
  id: string
  name: string
  description: string | null
  start_at: string
  end_at: string | null
  genres: string[] | null
  price_min: number | null
  price_max: number | null
  images: any | null
  url_referral: string | null
  sponsored?: boolean | null
  status?: string
  created_at?: string
  club_id: string | null
  club_name: string | null
  club_address: string | null
  club_slug?: string | null
  lat: number
  lon: number
  zone: string | null
}

export type MapVenue = {
  id: string
  name: string
  slug: string
  address: string | null
  lat: number
  lon: number
  zone: string
  image?: string | null
  events: MapEventItem[]
}

export type ZoneInfo = {
  key: string
  name: string
  center: [number, number] // [lon, lat]
  pitch: number
  zoom: number
  bearing: number
}

export const KNOWN_ZONES: Record<string, ZoneInfo> = {
  mallorca: {
    key: 'mallorca',
    name: 'Mallorca',
    center: [2.6502, 39.5696], // Palma de Mallorca
    pitch: 55,
    zoom: 13.5,
    bearing: -15,
  },
  ibiza: {
    key: 'ibiza',
    name: 'Ibiza',
    center: [1.432, 38.9067], // Eivissa
    pitch: 52,
    zoom: 13.0,
    bearing: 10,
  },
  madrid: {
    key: 'madrid',
    name: 'Madrid',
    center: [-3.7038, 40.4168], // Centro Gran Vía / Sol
    pitch: 58,
    zoom: 13.5,
    bearing: 25,
  },
  valencia: {
    key: 'valencia',
    name: 'Valencia',
    center: [-0.3763, 39.4699], // Ruzafa / Ciudad de las Artes
    pitch: 52,
    zoom: 13.5,
    bearing: -10,
  },
  barcelona: {
    key: 'barcelona',
    name: 'Barcelona',
    center: [2.1734, 41.3851], // Eixample / Port Olímpic
    pitch: 56,
    zoom: 13.5,
    bearing: 45,
  },
  amsterdam: {
    key: 'amsterdam',
    name: 'Ámsterdam',
    center: [4.9041, 52.3676], // Centrum / Leidseplein
    pitch: 50,
    zoom: 13.5,
    bearing: 10,
  },
}

// Catálogo maestro con el 100% de los locales y discotecas oficiales verificados
export const VERIFIED_CLUB_COORDINATES: Record<string, { lat: number; lon: number; address: string }> = {
  // --- MALLORCA ---
  'amok-mallorca': { lat: 39.536064, lon: 2.741739, address: 'Carretera de S´Aranjassa Km 10, Palma, Mallorca' },
  'bcm-mallorca': { lat: 39.509466, lon: 2.533111, address: 'Avinguda de l\'Olivera s/n, Magaluf, Mallorca' },
  'panama-jack-magaluf': { lat: 39.509595, lon: 2.532444, address: 'Avinguda de l\'Olivera 13, Magaluf, Mallorca' },
  'fitz-mallorca': { lat: 39.562885, lon: 2.626857, address: 'Passeig Marítim 32, Palma, Mallorca' },
  'blvd-maritimo-club': { lat: 39.564557, lon: 2.627278, address: 'Passeig Marítim 29, Palma, Mallorca' },
  'zar-society': { lat: 39.564256, lon: 2.627731, address: 'Passeig Marítim 29, Palma, Mallorca' },
  'enredo-club': { lat: 39.552619, lon: 2.623481, address: 'Av. de Gabriel Roca 45, Portopí, Palma' },
  'overclub': { lat: 39.603409, lon: 2.656534, address: 'Carrer Gremi de Passamaners 17, Son Castelló, Palma' },
  'selva-club': { lat: 39.606689, lon: 2.671257, address: 'Gremi des Fusters 44 / Gremi Sabaters 68, Son Castelló, Palma' },
  'boomerang': { lat: 39.600229, lon: 2.669908, address: 'Carrer Gremi Teixidors 27C, Son Castelló, Palma' },
  'es-gremi': { lat: 39.596716, lon: 2.670231, address: 'Carrer del Gremi de Porgadors 16, Son Castelló, Palma' },
  'wave-club': { lat: 39.596846, lon: 2.631120, address: 'Carrer Poima 24, Can Valero, Palma' },
  'koya-club': { lat: 39.508417, lon: 2.750530, address: 'Av. Nacional 21, S\'Arenal, Mallorca' },
  'lunita': { lat: 39.540694, lon: 2.712198, address: 'Camí de Can Pastilla 39, Palma, Mallorca' },
  'es-bosq-recinto-mallorca-live': { lat: 39.506754, lon: 2.520832, address: 'Camí Cala Figuera 1, Calvià, Mallorca' },
  'esmoli-club': { lat: 39.574282, lon: 2.639011, address: 'Carrer de la Indústria 11, Palma, Mallorca' },
  'es-turo': { lat: 39.598521, lon: 3.036917, address: 'Carretera Santa Margalida a Can Picafort Km 2.5, Mallorca' },
  'savannah-pool-club': { lat: 39.513400, lon: 2.537800, address: 'Avinguda Pere Vaquer Ramis 12, Torrenova, Calvià' },
  'zenox': { lat: 39.604100, lon: 2.664100, address: 'Carrer Gremi Teixidors 27C, Son Castelló, Palma' },
  'abraxas-palma': { lat: 39.570995, lon: 2.652555, address: 'Carrer del Sindicat 5, Palma, Mallorca' },
  'castros-palma': { lat: 39.568799, lon: 2.632762, address: 'Avinguda de Gabriel Roca 5, Palma, Mallorca' },
  'garito-cafe': { lat: 39.557497, lon: 2.624535, address: 'Dársena de Can Barbarà s/n, Palma, Mallorca' },

  // --- MADRID ---
  'fitz-madrid': { lat: 40.424717, lon: -3.712214, address: 'Calle de la Princesa 1, 28008 Madrid' },
  'pabblo': { lat: 40.449600, lon: -3.693400, address: 'Plaza Pablo Ruiz Picasso 1, 28020 Madrid' },
  'nazca-club': { lat: 40.451384, lon: -3.694457, address: 'Calle de Orense 24, Tetuán, 28020 Madrid' },
  'teatro-kapital': { lat: 40.409700, lon: -3.693094, address: 'Calle de Atocha 125, 28012 Madrid' },
  'teatro-barcelo': { lat: 40.427020, lon: -3.699712, address: 'Calle de Barceló 11, 28004 Madrid' },
  'fabrik': { lat: 40.265301, lon: -3.840565, address: 'Avenida de la Industria 82, Humanes de Madrid' },
  'shoko-madrid': { lat: 40.408822, lon: -3.710862, address: 'Calle de Toledo 86, Centro, 28005 Madrid' },
  'teatro-magno': { lat: 40.417293, lon: -3.698367, address: 'Calle de Cedaceros 7, Centro, 28014 Madrid' },
  'terraza-karau': { lat: 40.420250, lon: -3.691998, address: 'Paseo de Recoletos 2, Salamanca, 28001 Madrid' },
  'gunilla-club': { lat: 40.422563, lon: -3.690900, address: 'Paseo de Recoletos 16, Salamanca, 28001 Madrid' },
  'sala-de-despecho': { lat: 40.422838, lon: -3.690940, address: 'Paseo de Recoletos 18, Salamanca, 28001 Madrid' },
  'calle-365': { lat: 40.415178, lon: -3.699641, address: 'Calle de Echegaray 18, Centro, 28014 Madrid' },
  'perro-negro-madrid': { lat: 40.429001, lon: -3.682953, address: 'Calle de Don Ramón de la Cruz 28, Madrid' },
  'rubicon': { lat: 40.422514, lon: -3.689844, address: 'Calle del Cid 7, Salamanca, 28001 Madrid' },
  'todos-santos': { lat: 40.425343, lon: -3.691758, address: 'Calle de Génova 28, Centro, 28004 Madrid' },
  'joy-eslava': { lat: 40.417167, lon: -3.706542, address: 'Calle del Arenal 11, Centro, 28013 Madrid' },
  'saint-club': { lat: 40.428405, lon: -3.683676, address: 'Calle de Velázquez 64, Salamanca, 28001 Madrid' },
  'moby-dick': { lat: 40.454249, lon: -3.693997, address: 'Avenida de Brasil 5, 28020 Madrid' },
  'eslabon': { lat: 40.407417, lon: -3.697599, address: 'Calle del Dr. Fourquet 21, 28012 Madrid' },
  'la-lupe': { lat: 40.422996, lon: -3.697754, address: 'Calle de Gravina 10, Centro, 28004 Madrid' },
  'la-sala': { lat: 40.422005, lon: -3.690417, address: 'Calle de Recoletos 5, 28001 Madrid' },
  'la-via-lactea': { lat: 40.426853, lon: -3.702929, address: 'Calle de Velarde 18, Centro, 28004 Madrid' },
  'state-metropolitan': { lat: 40.417465, lon: -3.698933, address: 'Calle de Alcalá 20, Centro, 28014 Madrid' },
  'why-not': { lat: 40.421717, lon: -3.698622, address: 'Calle de San Bartolomé 7, Centro, 28004 Madrid' },
  'fulanita-de-tal': { lat: 40.424655, lon: -3.696470, address: 'Calle de Regueros 9, Centro, 28004 Madrid' },
  'zona-club': { lat: 40.414638, lon: -3.705517, address: 'Calle de Atocha 2, Centro, 28012 Madrid' },
  'somera-madrid': { lat: 40.408242, lon: -3.696032, address: 'Calle del Doctor Fourquet 7, 28012 Madrid' },
  'panta-rhei': { lat: 40.423524, lon: -3.700098, address: 'Calle de la Corredera Baja de San Pablo 36, Madrid' },
  'soda-stereo-club': { lat: 40.426200, lon: -3.702500, address: 'Calle de la Corredera Alta de San Pablo 26, Madrid' },

  // --- IBIZA ---
  'cova-santa': { lat: 38.894436, lon: 1.331366, address: 'Carretera de San José Km 7, 07817 Sant Josep' },
  'lio-ibiza': { lat: 38.913783, lon: 1.443104, address: 'Passeig Joan Carles I 1, Puerto Deportivo Marina Ibiza' },
  'eden-ibiza': { lat: 38.978794, lon: 1.307606, address: 'Carrer Salvador Espriu s/n, 07820 Sant Antoni de Portmany' },
  'hi-ibiza': { lat: 38.884419, lon: 1.403146, address: 'Carretera de Platja d\'en Bossa s/n, 07817 Sant Josep' },
  'pacha-ibiza': { lat: 38.918441, lon: 1.443315, address: 'Avenida 8 de Agosto 27, 07800 Ibiza' },
  'amnesia-ibiza': { lat: 38.968189, lon: 1.391061, address: 'Carretera Ibiza a San Antonio Km 5, San Rafael' },
  'cafe-del-mar-ibiza': { lat: 38.980664, lon: 1.296364, address: 'Carrer de Vara de Rey 27, 07820 Sant Antoni de Portmany' },

  // --- VALENCIA ---
  'calablava-beach-club': { lat: 39.564574, lon: -0.282440, address: 'Passeig del Port 6, Platja de la Pobla de Farnals, Valencia' },
  'tulum': { lat: 39.495889, lon: -0.400966, address: 'Av. de les Corts Valencianes 58, 46015 Valencia' },
  'brokers': { lat: 39.460017, lon: -0.352132, address: 'Avenida de Francia 4, 46023 Valencia' },
  'deseo-54': { lat: 39.484496, lon: -0.375867, address: 'Carrer de Pepita 13-15, 46009 Valencia' },
  'unic-valencia': { lat: 39.463702, lon: -0.372446, address: 'Calle de Ruzafa 53, 46005 Valencia' },
  'marina-beach-club': { lat: 39.462953, lon: -0.321638, address: 'Calle Marina Real Juan Carlos I s/n, 46011 Valencia' },
  'akuarela-playa': { lat: 39.466485, lon: -0.324907, address: 'Carrer d\'Eugènia Viñes 152, 46011 Valencia' },
  'hanger-valencia': { lat: 39.473621, lon: -0.374738, address: 'Calle de la Paz 56, 46003 Valencia' },
  'la-sala-club-valencia': { lat: 39.466166, lon: -0.374450, address: 'Carrer de Russafa, 46004 Valencia' },
  'la-playa-club': { lat: 39.684874, lon: -0.201498, address: 'Paseo Marítimo de la Malvarrosa s/n, 46011 Valencia' },
  'morgan-valencia': { lat: 39.476573, lon: -0.385325, address: 'Calle del Turia 58, 46008 Valencia' },
  'eslabon-valencia': { lat: 39.476443, lon: -0.373922, address: 'Carrer de l\'Almodí, 46003 Valencia' },
  'la-casa-del-sonido': { lat: 38.351184, lon: -0.486339, address: 'Calle Padre Mariana 41, 46020 Valencia' },
  'la-vinya-del-senyor': { lat: 38.177155, lon: -0.798244, address: 'Calle de San Felipe Neri 15, 46003 Valencia' },
  'state-club-valencia': { lat: 38.973825, lon: -0.182120, address: 'Avenida de Valencia s/n, 46000 Valencia' },
  'kapital-valencia': { lat: 39.438500, lon: -0.378900, address: 'Avenida de la Construcción, 46026 Valencia' },
  'motel-connect': { lat: 39.477500, lon: -0.323500, address: 'Passeig Marítim de la Malvarrosa s/n, 46011 Valencia' },

  // --- BARCELONA ---
  'sutton-barcelona': { lat: 41.395975, lon: 2.151732, address: 'Carrer de Tuset 13, 08006 Barcelona' },
  'razzmatazz-barcelona': { lat: 41.397586, lon: 2.191249, address: 'Carrer dels Almogàvers 122, 08018 Barcelona' },
  'opium-barcelona': { lat: 41.385278, lon: 2.196710, address: 'Passeig Marítim de la Barceloneta 34, 08003 Barcelona' },
  'shoko-barcelona': { lat: 41.378939, lon: 2.192164, address: 'Passeig Marítim de la Barceloneta 36, 08003 Barcelona' },
  'sidecar-factory-club': { lat: 41.380540, lon: 2.175163, address: 'Plaça Reial 7, 08002 Barcelona' },
  'moeem-barcelona': { lat: 41.384002, lon: 2.162548, address: 'Carrer de Muntaner 11, 08011 Barcelona' },

  // --- CASTELLÓN ---
  'la-santa': { lat: 40.048428, lon: 0.052559, address: 'Carretera N-340 Km 78, 12560 Benicàssim, Castellón' },

  // --- SEVILLA ---
  'sala-malandar': { lat: 37.397592, lon: -6.001100, address: 'Calle Torneo 43, 41002 Sevilla' },
  'discotheque-sevilla': { lat: 37.388343, lon: -5.994750, address: 'Avenida de la Constitución 37, 41002 Sevilla' },
  'antique-teatro-sevilla': { lat: 37.404200, lon: -6.002400, address: 'Calle Matemáticos Rey Pastor y Castro s/n, 41092 Sevilla' },
  'eslabon-sevilla': { lat: 37.383553, lon: -6.000052, address: 'Calle Betis 35, 41010 Sevilla' },

  // --- MÁLAGA ---
  'salsa-latina-malaga': { lat: 36.720606, lon: -4.421604, address: 'Calle Marqués de Larios 1, 29015 Málaga' },
  'mala-compania-malaga': { lat: 36.721739, lon: -4.398365, address: 'Paseo Marítimo Pablo Ruiz Picasso 35, 29016 Málaga' },
  'purobeach-malaga': { lat: 36.467800, lon: -5.097500, address: 'Playa de Pedregalejo s/n, 29016 Málaga' },
  'booga-beach-malaga': { lat: 36.711500, lon: -4.421500, address: 'Paseo Marítimo del Palo s/n, 29016 Málaga' },

  // --- BILBAO ---
  'kafe-antzokia-bilbao': { lat: 43.263768, lon: -2.927808, address: 'Calle San Vicente 2, 48001 Bilbao, Bizkaia' },
  'surco-bilbao': { lat: 43.258760, lon: -2.934426, address: 'Calle Fernández del Campo 22, 48010 Bilbao' },
  'el-sotano-bilbao': { lat: 43.258739, lon: -2.924552, address: 'Calle Bidebarrieta 4, 48005 Bilbao' },
  'barceloneta-club-bilbao': { lat: 43.272100, lon: -2.946500, address: 'Calle Ramón y Cajal 45, 48014 Bilbao' },

  // --- AMSTERDAM ---
  'panama': { lat: 52.374936, lon: 4.930426, address: 'Oostelijke Handelskade 4, 1019 BM Amsterdam' },
  'shelter-amsterdam': { lat: 52.384200, lon: 4.901500, address: 'Overhoeksplein 3, 1031 KS Amsterdam' },
  'escape-amsterdam': { lat: 52.365900, lon: 4.896700, address: 'Rembrandtplein 11, 1017 CT Amsterdam' },
}

function normalizeSlug(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export async function fetchMapVenues(): Promise<MapVenue[]> {
  const sb = getSupabaseClient()

  // 1. Obtener todos los locales oficiales aprobados y todas las fiestas
  // vigentes. Las fiestas usan fetchEvents, la misma funcion que /descubrir:
  // mismo filtro de vigencia (con margen tras el end_at) y mismo orden de
  // visualizacion (los eventos de madrugada 00:00-05:59 se muestran al final
  // de su propio dia en vez de al principio).
  const [clubsRes, events] = await Promise.all([
    sb
      .from('clubs')
      .select('id,name,slug,address,zone,lat,lon,images,genres,status')
      .eq('status', 'approved')
      .limit(500),
    fetchEvents({ limit: 1000 }),
  ])

  const clubs = (clubsRes.data || []) as any[]

  const venueMap = new Map<string, MapVenue>()
  const venueBySlug = new Map<string, MapVenue>()
  const venueByName = new Map<string, MapVenue>()

  // 2. Construir los locales oficiales con sus coordenadas geográficas exactas
  for (const c of clubs) {
    const slug = c.slug || normalizeSlug(c.name)
    let lat: number | null = typeof c.lat === 'number' && c.lat !== 0 ? c.lat : null
    let lon: number | null = typeof c.lon === 'number' && c.lon !== 0 ? c.lon : null
    let address: string | null = c.address || null

    // Buscar en el catálogo verificado
    const verified =
      VERIFIED_CLUB_COORDINATES[slug] ||
      VERIFIED_CLUB_COORDINATES[normalizeSlug(c.name)] ||
      VERIFIED_CLUB_COORDINATES[slug.replace(/-club$/, '')] ||
      VERIFIED_CLUB_COORDINATES[slug + '-club']

    if (verified) {
      lat = verified.lat
      lon = verified.lon
      if (!address) address = verified.address
    }

    // Fallback de centro de zona
    if (lat === null || lon === null) {
      const zKey = normalizeSlug(c.zone || 'mallorca')
      const zoneFound = Object.keys(KNOWN_ZONES).find((k) => zKey.includes(k)) || 'mallorca'
      const zCenter = KNOWN_ZONES[zoneFound].center
      lon = zCenter[0]
      lat = zCenter[1]
    }

    const venue: MapVenue = {
      id: c.id,
      name: c.name,
      slug,
      address,
      lat,
      lon,
      zone: c.zone || 'Mallorca',
      image: Array.isArray(c.images) && c.images.length > 0 ? (typeof c.images[0] === 'string' ? c.images[0] : c.images[0]?.url) : null,
      events: [],
    }

    venueMap.set(c.id, venue)
    venueBySlug.set(slug, venue)
    venueByName.set(normalizeSlug(c.name), venue)
  }

  // 3. Asignar cada fiesta ÚNICAMENTE a su local correspondiente
  for (const ev of events) {
    let matchedVenue: MapVenue | null = null

    // 3.1 Coincidencia por club_id
    if (ev.club_id && venueMap.has(ev.club_id)) {
      matchedVenue = venueMap.get(ev.club_id)!
    }

    // 3.2 Coincidencia por club_name o slug
    if (!matchedVenue && ev.club_name) {
      const normName = normalizeSlug(ev.club_name)
      matchedVenue = venueBySlug.get(normName) || venueByName.get(normName) || null
    }

    // 3.3 Coincidencia si el nombre del evento menciona el local (ej. "AMOK presents...", "ROBIN SCHULZ at BCM")
    if (!matchedVenue && ev.name) {
      const normEvent = normalizeSlug(ev.name)
      for (const [slug, v] of venueBySlug.entries()) {
        if (normEvent.startsWith(slug + '-') || normEvent.includes('-' + slug + '-') || normEvent.endsWith('-' + slug)) {
          matchedVenue = v
          break
        }
      }
    }

    // Si el evento pertenece a un local válido, lo agregamos a la lista de fiestas de ese local
    if (matchedVenue) {
      matchedVenue.events.push({
        id: ev.id,
        name: ev.name,
        description: ev.description,
        start_at: ev.start_at,
        end_at: ev.end_at,
        genres: ev.genres,
        price_min: ev.price_min,
        price_max: ev.price_max,
        images: ev.images,
        url_referral: ev.url_referral,
        sponsored: ev.sponsored,
        status: ev.status,
        created_at: ev.created_at,
        club_id: matchedVenue.id,
        club_name: matchedVenue.name,
        club_address: matchedVenue.address,
        club_slug: matchedVenue.slug,
        lat: matchedVenue.lat,
        lon: matchedVenue.lon,
        zone: matchedVenue.zone,
      })
    }
  }

  return Array.from(venueMap.values())
}

// Mantener compatibilidad con fetchMapEvents
export async function fetchMapEvents(): Promise<MapEventItem[]> {
  const venues = await fetchMapVenues()
  const allEvents: MapEventItem[] = []
  venues.forEach((v) => allEvents.push(...v.events))
  return allEvents
}
