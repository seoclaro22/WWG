"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Dict = Record<string, string>

const dictionaries: Record<string, Dict> = {
  es: {
    'nav.home': 'Descubrir',
    'nav.tickets': 'Tickets',
    'nav.promote': 'Promociona',
    'nav.signin': 'Entrar',
    'nav.account': 'Cuenta',
    'nav.favorites': 'Favoritos',

    'landing.badge': 'Agenda local curada por expertos',
    'landing.locale_hint': 'ES · EN · DE',
    'landing.subtitle': 'La agenda local definitiva. Curada por expertos.',
    'landing.placeholder': 'Donde sales hoy? (Ej. Palma)',
    'landing.cta': 'Buscar planes',
    'landing.use_location': 'Usar mi ubicacion',
    'landing.using_location': 'Detectando ubicacion...',
    'landing.locating': 'Buscando tu ubicacion...',
    'landing.locating_auto': 'Pidiendo permiso de ubicacion...',
    'landing.located': 'Ubicacion detectada.',
    'landing.located_fallback': 'Ubicacion aproximada por coordenadas.',
    'landing.geo_denied': 'No pudimos obtener tu ubicacion. Activa permisos o escribe tu zona.',
    'landing.geo_not_supported': 'Tu navegador no permite geolocalizacion.',
    'landing.no_events': 'No tenemos eventos para esa zona.',
    'landing.no_events_fallback': 'No hay eventos en {zone}. Mostrando {fallback}.',
    'landing.error_empty': 'Escribe una zona para continuar.',
    'landing.point_curated': 'Selecciones curadas',
    'landing.point_live': 'Eventos en tiempo real',
    'landing.point_multi': 'Multi idioma',

    'discover.title': 'La noche empieza aqui',
    'tabs.events': 'Proximos eventos',
    'tabs.clubs': 'Clubs',
    'tabs.djs': 'DJs',
    'filters.search': 'Buscar...',
    'filters.date': 'Fecha',
    'filters.genre': 'Genero',
    'filters.zone': 'Zona',
    'date.today': 'Hoy',
    'date.tomorrow': 'Manana',
    'date.weekend': 'Fin de semana',
    'date.week': 'Proxima semana',
    'date.month': 'Este mes',

    'action.reserve': 'Reservar',
    'action.reserve_tickets': 'Reservar Entradas',
    'action.directions': '📍 Como llegar',
    'action.follow': 'Seguir',
    'action.following': 'Siguiendo',
    'action.save': 'Guardar',
    'action.saved': 'En favoritos',
    'action.approve': 'Aprobar',
    'action.reject': 'Rechazar',
    'action.remove': 'Quitar',
    'action.signout': 'Cerrar sesion',
    'action.save_changes': 'Guardar',
    'action.share': 'Compartir',

    'tickets.title': 'Tickets',
    'tickets.empty': 'Aun no has reservado ningun evento.',
    'favorites.title': 'Mis Favoritos',
    'favorites.empty': 'No tienes favoritos aun.',

    'event.description': 'Descripcion',
    'event.lineup': 'Line-up',
    'event.no_reservations': 'Reservas no disponibles',
    'event.sponsored': 'Patrocinado',

    'account.title': 'Cuenta',
    'account.email': 'Email',
    'account.display_name': 'Nombre a mostrar',
    'account.language': 'Idioma',
    'account.privacy': 'Privacidad',
    'account.cookies': 'Politica de Cookies',
    'account.privacy_policy': 'Politica de Privacidad',
    'account.danger': 'Zona peligrosa',
    'account.danger_text': 'Esta accion eliminara tus datos en NightHub y cerrara la sesion.',
    'account.delete_btn': 'Borrar mis datos y cerrar cuenta en esta app',

    'auth.title': 'Where We Go',
    'auth.subtitle': 'Accede a la cuenta para empezar',
    'auth.email': 'Email',
    'auth.password': 'Contrasena',
    'auth.signin': 'Iniciar sesion',
    'auth.signup': 'Crear cuenta',
    'auth.to_signup': 'Aun no tienes cuenta? Registrate',
    'auth.to_signin': 'Ya tienes cuenta? Inicia sesion',

    'admin.title': 'Back Office',
    'admin.pending_reviews': 'Resenas en moderacion',
    'admin.pending_submissions': 'Altas pendientes',
    'admin.no_reviews': 'No hay resenas pendientes.',
    'admin.no_submissions': 'No hay solicitudes pendientes.',
    'admin.login_required': 'Debes iniciar sesion.',
    'admin.no_permissions': 'No tienes permisos.',

    'cookie.banner': 'Usamos cookies para que la app funcione y mejorar la experiencia.',
    'cookie.accept': 'Aceptar',
    'cookie.reject': 'Rechazar',
    'cookie.reset': 'Reconfigurar preferencias de cookies',
    'consent.accept': 'Acepto la',
    'consent.and': 'y la',
    'legal.notice': 'Consulta nuestras politicas:',

    'common.login_to_view': 'Inicia sesion para ver esta seccion.',

    'promote.title': 'Promociona tu Evento/Club',
    'promote.type': 'Tipo',
    'promote.type.event': 'Evento',
    'promote.type.club': 'Club',
    'promote.name': 'Nombre del Club/Evento',
    'promote.address': 'Direccion',
    'promote.description': 'Descripcion',
    'promote.email': 'Email de Contacto',
    'promote.phone': 'Telefono',
    'promote.ref': 'Link de Referido (opcional)',
    'promote.sponsored': 'Evento patrocinado',
    'promote.sponsored_yes': 'Si, quiero patrocinio',
    'promote.sponsored_no': 'No, gracias',
    'promote.sponsored_hint': 'El patrocinio tiene un precio a convenir y lo gestionamos por email.',
    'promote.submit': 'Enviar Solicitud',
    'promote.success': 'Gracias. Revisaremos tu solicitud en breve.',
    'promote.disclaimer': 'La informacion proporcionada se utilizara para crear la ficha del evento o club. El telefono y el email de contacto se guardaran de forma privada y solo se usaran para comunicarnos contigo. No se mostraran publicamente.',

    'benefits.title': 'Por que registrarte',
    'benefits.save': 'Guardar eventos como favoritos.',
    'benefits.follow': 'Seguir clubs y DJs para alertas.',
    'benefits.tickets': 'Historial en Tickets con tus reservas.',
    'benefits.sync': 'Sincronizacion entre dispositivos.',
    'benefits.reviews': 'Escribir resenas.',
    'benefits.push': 'Notificaciones push (proximamente).',

    'reviews.title': 'Resenas',
    'reviews.empty': 'Aun no hay resenas publicadas.',
    'reviews.login': 'Inicia sesion para escribir una resena.',
    'reviews.write_hint': 'Escribe tu resena:',
    'loading': 'Cargando...',

    'dj.upcoming': 'Proximos eventos',
    'dj.no_upcoming': 'No hay eventos proximos.',
    'dj.similar': 'Tambien te puede gustar',
    'action.view': 'Ver',
    'share.copied': 'Enlace copiado. Pegalo en Instagram.'
  },
  en: {
    'nav.home': 'Discover',
    'nav.tickets': 'Tickets',
    'nav.promote': 'Promote',
    'nav.signin': 'Sign in',
    'nav.account': 'Account',
    'nav.favorites': 'Favorites',

    'landing.badge': 'Local agenda curated by experts',
    'landing.locale_hint': 'ES · EN · DE',
    'landing.subtitle': 'The definitive local guide. Curated picks, live now.',
    'landing.placeholder': 'Where are you going out? (e.g. Palma)',
    'landing.cta': 'Find plans',
    'landing.use_location': 'Use my location',
    'landing.using_location': 'Detecting location...',
    'landing.locating': 'Getting your location...',
    'landing.locating_auto': 'Requesting location access...',
    'landing.located': 'Location detected.',
    'landing.located_fallback': 'Using approximate coordinates.',
    'landing.geo_denied': 'Could not get your location. Enable permission or type your area.',
    'landing.geo_not_supported': 'Your browser does not allow geolocation.',
    'landing.no_events': 'No events are available for that area.',
    'landing.no_events_fallback': 'No events in {zone}. Showing {fallback}.',
    'landing.error_empty': 'Type a zone to continue.',
    'landing.point_curated': 'Curated picks',
    'landing.point_live': 'Live events',
    'landing.point_multi': 'Multi language',

    'discover.title': 'The night starts here',
    'tabs.events': 'Upcoming events',
    'tabs.clubs': 'Clubs',
    'tabs.djs': 'DJs',
    'filters.search': 'Search...',
    'filters.date': 'Date',
    'filters.genre': 'Genre',
    'filters.zone': 'Zone',
    'date.today': 'Today',
    'date.tomorrow': 'Tomorrow',
    'date.weekend': 'Weekend',
    'date.week': 'Next week',
    'date.month': 'This month',

    'action.reserve': 'Reserve',
    'action.reserve_tickets': 'Get Tickets',
    'action.directions': '📍 Directions',
    'action.follow': 'Follow',
    'action.following': 'Following',
    'action.save': 'Save',
    'action.saved': 'Saved',
    'action.approve': 'Approve',
    'action.reject': 'Reject',
    'action.remove': 'Remove',
    'action.signout': 'Sign out',
    'action.save_changes': 'Save',
    'action.share': 'Share',

    'tickets.title': 'Tickets',
    'tickets.empty': 'You have no reservations yet.',
    'favorites.title': 'My Favorites',
    'favorites.empty': "You don't have favorites yet.",

    'event.description': 'Description',
    'event.lineup': 'Line-up',
    'event.no_reservations': 'Reservations not available',
    'event.sponsored': 'Sponsored',

    'account.title': 'Account',
    'account.email': 'Email',
    'account.display_name': 'Display name',
    'account.language': 'Language',
    'account.privacy': 'Privacy',
    'account.cookies': 'Cookie Policy',
    'account.privacy_policy': 'Privacy Policy',
    'account.danger': 'Danger zone',
    'account.danger_text': 'This will delete your data in NightHub and sign you out.',
    'account.delete_btn': 'Delete my data and sign out',

    'auth.title': 'Where We Go',
    'auth.subtitle': 'Sign in to start',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signin': 'Sign in',
    'auth.signup': 'Create account',
    'auth.to_signup': 'No account? Sign up',
    'auth.to_signin': 'Have an account? Sign in',

    'admin.title': 'Back Office',
    'admin.pending_reviews': 'Reviews in moderation',
    'admin.pending_submissions': 'Pending submissions',
    'admin.no_reviews': 'No pending reviews.',
    'admin.no_submissions': 'No pending requests.',
    'admin.login_required': 'You must sign in.',
    'admin.no_permissions': 'No permissions.',

    'cookie.banner': 'We use cookies to run the app and improve the experience.',
    'cookie.accept': 'Accept',
    'cookie.reject': 'Reject',
    'cookie.reset': 'Reset cookie preferences',
    'consent.accept': 'I accept the',
    'consent.and': 'and',
    'legal.notice': 'Review our policies:',

    'common.login_to_view': 'Login to view this section.',

    'promote.title': 'Promote your Event/Club',
    'promote.type': 'Type',
    'promote.type.event': 'Event',
    'promote.type.club': 'Club',
    'promote.name': 'Club/Event name',
    'promote.address': 'Address',
    'promote.description': 'Description',
    'promote.email': 'Contact Email',
    'promote.phone': 'Phone',
    'promote.ref': 'Referral link (optional)',
    'promote.sponsored': 'Sponsored event',
    'promote.sponsored_yes': 'Yes, I want sponsorship',
    'promote.sponsored_no': 'No, thanks',
    'promote.sponsored_hint': 'Sponsorship pricing is agreed by email after submission.',
    'promote.submit': 'Send Request',
    'promote.success': 'Thanks. We will review your request soon.',
    'promote.disclaimer': 'The information you provide will be used to create the event/club listing. The contact phone and email will be kept private and used only to contact you. They will not be shown publicly.',

    'benefits.title': 'Why register',
    'benefits.save': 'Save events as favorites.',
    'benefits.follow': 'Follow clubs and DJs to get alerts.',
    'benefits.tickets': 'Tickets history with recent reservations.',
    'benefits.sync': 'Sync across devices.',
    'benefits.reviews': 'Write reviews.',
    'benefits.push': 'Push notifications (soon).',

    'reviews.title': 'Reviews',
    'reviews.empty': 'No reviews yet.',
    'reviews.login': 'Login to write a review.',
    'reviews.write_hint': 'Write your review:',
    'loading': 'Loading...',

    'dj.upcoming': 'Upcoming events',
    'dj.no_upcoming': 'No upcoming events.',
    'dj.similar': 'You may also like',
    'action.view': 'View',
    'share.copied': 'Link copied. Paste it in Instagram.'
  },
  de: {
    'nav.home': 'Entdecken',
    'nav.tickets': 'Tickets',
    'nav.promote': 'Promoten',
    'nav.signin': 'Anmelden',
    'nav.account': 'Konto',
    'nav.favorites': 'Favoriten',

    'landing.badge': 'Lokale Agenda von Experten kuratiert',
    'landing.locale_hint': 'ES · EN · DE',
    'landing.subtitle': 'Der ultimative lokale Guide. Von Experten kuratiert.',
    'landing.placeholder': 'Wohin gehst du heute? (z.B. Palma)',
    'landing.cta': 'Finde Plaene',
    'landing.use_location': 'Meinen Standort nutzen',
    'landing.using_location': 'Standort wird ermittelt...',
    'landing.locating': 'Standort wird abgerufen...',
    'landing.locating_auto': 'Standorterlaubnis wird angefragt...',
    'landing.located': 'Standort erkannt.',
    'landing.located_fallback': 'Ungefaehre Koordinaten genutzt.',
    'landing.geo_denied': 'Standort konnte nicht ermittelt werden. Erlaube den Zugriff oder tippe deine Zone.',
    'landing.geo_not_supported': 'Dein Browser erlaubt keine Geolokalisierung.',
    'landing.no_events': 'Keine Events fur diese Zone vorhanden.',
    'landing.no_events_fallback': 'Keine Events in {zone}. Zeige {fallback}.',
    'landing.error_empty': 'Gib eine Zone ein, um fortzufahren.',
    'landing.point_curated': 'Kuratiert',
    'landing.point_live': 'Live Events',
    'landing.point_multi': 'Mehrsprachig',

    'discover.title': 'Die Nacht beginnt hier',
    'tabs.events': 'Bevorstehende Events',
    'tabs.clubs': 'Clubs',
    'tabs.djs': 'DJs',
    'filters.search': 'Suchen...',
    'filters.date': 'Datum',
    'filters.genre': 'Genre',
    'filters.zone': 'Zone',
    'date.today': 'Heute',
    'date.tomorrow': 'Morgen',
    'date.weekend': 'Wochenende',
    'date.week': 'Nachste Woche',
    'date.month': 'Dieser Monat',

    'action.reserve': 'Reservieren',
    'action.reserve_tickets': 'Tickets reservieren',
    'action.directions': '📍 Route',
    'action.follow': 'Folgen',
    'action.following': 'Folgt',
    'action.save': 'Speichern',
    'action.saved': 'Gespeichert',
    'action.approve': 'Genehmigen',
    'action.reject': 'Ablehnen',
    'action.remove': 'Entfernen',
    'action.signout': 'Abmelden',
    'action.save_changes': 'Speichern',
    'action.share': 'Teilen',

    'tickets.title': 'Tickets',
    'tickets.empty': 'Du hast noch keine Reservierungen.',
    'favorites.title': 'Favoriten',
    'favorites.empty': 'Noch keine Favoriten.',

    'event.description': 'Beschreibung',
    'event.lineup': 'Line-up',
    'event.no_reservations': 'Reservierungen nicht verfugbar',
    'event.sponsored': 'Gesponsert',

    'account.title': 'Konto',
    'account.email': 'E-Mail',
    'account.display_name': 'Anzeigename',
    'account.language': 'Sprache',
    'account.privacy': 'Datenschutz',
    'account.cookies': 'Cookie-Richtlinie',
    'account.privacy_policy': 'Datenschutzerklarung',
    'account.danger': 'Gefahrenzone',
    'account.danger_text': 'Dies loscht deine Daten in NightHub und meldet dich ab.',
    'account.delete_btn': 'Meine Daten loschen und abmelden',

    'auth.title': 'Where We Go',
    'auth.subtitle': 'Melde dich an, um zu starten',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.signin': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.to_signup': 'Noch kein Konto? Registrieren',
    'auth.to_signin': 'Bereits ein Konto? Anmelden',

    'admin.title': 'Back Office',
    'admin.pending_reviews': 'Bewertungen in Moderation',
    'admin.pending_submissions': 'Ausstehende Einsendungen',
    'admin.no_reviews': 'Keine ausstehenden Bewertungen.',
    'admin.no_submissions': 'Keine ausstehenden Anfragen.',
    'admin.login_required': 'Bitte zuerst anmelden.',
    'admin.no_permissions': 'Keine Berechtigungen.',

    'cookie.banner': 'Wir verwenden Cookies, um die App zu betreiben und zu verbessern.',
    'cookie.accept': 'Akzeptieren',
    'cookie.reject': 'Ablehnen',
    'cookie.reset': 'Cookie-Einstellungen zurucksetzen',
    'consent.accept': 'Ich akzeptiere die',
    'consent.and': 'und die',
    'legal.notice': 'Unsere Richtlinien:',

    'common.login_to_view': 'Zum Anzeigen bitte anmelden.',

    'promote.title': 'Event/Club bewerben',
    'promote.type': 'Typ',
    'promote.type.event': 'Event',
    'promote.type.club': 'Club',
    'promote.name': 'Name des Clubs/Events',
    'promote.address': 'Adresse',
    'promote.description': 'Beschreibung',
    'promote.email': 'E-Mail',
    'promote.phone': 'Telefon',
    'promote.ref': 'Referral-Link (optional)',
    'promote.sponsored': 'Gesponsertes Event',
    'promote.sponsored_yes': 'Ja, Sponsoring',
    'promote.sponsored_no': 'Nein, danke',
    'promote.sponsored_hint': 'Preis nach Absprache, wir melden uns per E-Mail.',
    'promote.submit': 'Anfrage senden',
    'promote.success': 'Danke. Wir prufen deine Anfrage bald.',
    'promote.disclaimer': 'Die angegebenen Daten werden zur Erstellung des Event-/Clubeintrags verwendet. Telefon und E-Mail bleiben privat und dienen nur der Kontaktaufnahme. Sie werden nicht offentlich angezeigt.',

    'benefits.title': 'Warum registrieren',
    'benefits.save': 'Events als Favoriten speichern.',
    'benefits.follow': 'Clubs und DJs folgen.',
    'benefits.tickets': 'Tickets-Verlauf mit Reservierungen.',
    'benefits.sync': 'Synchronisierung uber Gerate.',
    'benefits.reviews': 'Bewertungen schreiben.',
    'benefits.push': 'Push-Benachrichtigungen (bald).',

    'reviews.title': 'Bewertungen',
    'reviews.empty': 'Noch keine Bewertungen.',
    'reviews.login': 'Zum Schreiben anmelden.',
    'reviews.write_hint': 'Schreibe deine Bewertung:',
    'loading': 'Laden...',

    'dj.upcoming': 'Bevorstehende Events',
    'dj.no_upcoming': 'Keine bevorstehenden Events.',
    'dj.similar': 'Das koennte dir auch gefallen',
    'action.view': 'Ansehen',
    'share.copied': 'Link kopiert. Fuege ihn in Instagram ein.'
  }
}

type I18n = {
  locale: string
  setLocale: (l: string) => void
  t: (k: string) => string
}

const I18nCtx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>('es')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nh-locale') : null
    if (saved) setLocale(saved)
  }, [])

  const t = (k: string) => {
    const dict = dictionaries[locale] || dictionaries.es
    return dict[k] || k
  }

  function change(l: string) {
    setLocale(l)
    if (typeof window !== 'undefined') localStorage.setItem('nh-locale', l)
  }

  return <I18nCtx.Provider value={{ locale, setLocale: change, t }}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('I18nProvider missing')
  return ctx
}

export function T({ k }: { k: string }) {
  const { t } = useI18n()
  return <>{t(k)}</>
}
