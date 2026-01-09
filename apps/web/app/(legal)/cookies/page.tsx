"use client"
import { ResetConsentButton } from '@/components/CookieConsent'
import { useI18n } from '@/lib/i18n'

export default function CookiesPage() {
  const { locale } = useI18n()

  const ES = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Política de Cookies</h1>
      <p className="muted">Esta política describe qué son las cookies, qué tipos utilizamos en NightHub Mallorca y cómo puedes gestionarlas. Algunas cookies son necesarias para el funcionamiento de la web. Otras nos ayudan a mejorar el servicio.</p>
      <Section n={1} title="¿Qué son las cookies?"><p>Pequeños archivos que se almacenan en tu dispositivo cuando navegas. Permiten recordar tus preferencias, mantener la sesión o realizar analítica agregada.</p></Section>
      <Types es />
      <Section n={3} title="Duración"><p>Las cookies pueden ser de sesión (se borran al cerrar el navegador) o persistentes (permanecen un tiempo definido). Respetamos los plazos mínimos necesarios para cada finalidad.</p></Section>
      <Section n={4} title="Gestión y revocación del consentimiento">
        <ul className="list-disc pl-5 text-white/80">
          <li>Puedes configurar tu navegador para aceptar, bloquear o eliminar cookies.</li>
          <li>Si rechazas cookies no esenciales, la app seguirá funcionando, aunque ciertas funciones podrían verse limitadas.</li>
          <li>En móviles, también puedes gestionar identificadores publicitarios desde los ajustes del sistema.</li>
        </ul>
      </Section>
      <Section n={5} title="Terceros"><p>Cuando sigues enlaces a webs de entradas, hoteles o transporte, esos terceros pueden instalar sus propias cookies. Consulta sus políticas para más información.</p></Section>
      <Section n={6} title="Actualizaciones"><p>Podemos actualizar esta política. Te informaremos de cambios significativos por medios razonables.</p></Section>
      <ResetConsentButton />
    </div>
  )

  const EN = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cookie Policy</h1>
      <p className="muted">This policy describes what cookies are, which types we use on NightHub Mallorca and how you can manage them. Some cookies are necessary for the website to function; others help us improve the service.</p>
      <Section n={1} title="What are cookies?"><p>Small files stored on your device while browsing. They let us remember preferences, keep you signed in or perform aggregated analytics.</p></Section>
      <Types />
      <Section n={3} title="Duration"><p>Cookies may be session (removed when you close the browser) or persistent (kept for a defined period). We keep only what is necessary.</p></Section>
      <Section n={4} title="Managing and revoking consent">
        <ul className="list-disc pl-5 text-white/80">
          <li>You can configure your browser to accept, block or delete cookies.</li>
          <li>If you reject non‑essential cookies, the app still works, with some features limited.</li>
          <li>On mobile, you can also manage advertising identifiers in system settings.</li>
        </ul>
      </Section>
      <Section n={5} title="Third parties"><p>When you follow links to ticketing, hotels or transport, those sites may set their own cookies. Check their policies for details.</p></Section>
      <Section n={6} title="Updates"><p>We may update this policy and will notify you of significant changes.</p></Section>
      <ResetConsentButton />
    </div>
  )

  const DE = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cookie‑Richtlinie</h1>
      <p className="muted">Diese Richtlinie beschreibt, was Cookies sind, welche Arten wir bei NightHub Mallorca verwenden und wie du sie verwalten kannst. Einige Cookies sind für die Funktion der Website erforderlich; andere helfen uns, den Dienst zu verbessern.</p>
      <Section n={1} title="Was sind Cookies?"><p>Kleine Dateien, die beim Surfen auf deinem Gerät gespeichert werden. Sie ermöglichen es, Einstellungen zu merken, die Sitzung aufrechtzuerhalten oder aggregierte Analysen durchzuführen.</p></Section>
      <Types de />
      <Section n={3} title="Dauer"><p>Cookies können Sitzungs‑ (werden beim Schließen des Browsers entfernt) oder persistente Cookies sein (bleiben für einen definierten Zeitraum). Wir nutzen nur die nötigen Zeiträume.</p></Section>
      <Section n={4} title="Verwaltung und Widerruf der Einwilligung">
        <ul className="list-disc pl-5 text-white/80">
          <li>Du kannst deinen Browser so einstellen, dass er Cookies akzeptiert, blockiert oder löscht.</li>
          <li>Wenn du nicht notwendige Cookies ablehnst, funktioniert die App weiterhin, ggf. mit eingeschränkten Funktionen.</li>
          <li>Auf Mobilgeräten kannst du Werbe‑IDs in den Systemeinstellungen verwalten.</li>
        </ul>
      </Section>
      <Section n={5} title="Dritte"><p>Bei Links zu Ticket‑, Hotel‑ oder Transportseiten können diese eigene Cookies setzen. Beachte deren Richtlinien.</p></Section>
      <Section n={6} title="Aktualisierungen"><p>Wir können diese Richtlinie aktualisieren und dich bei wesentlichen Änderungen informieren.</p></Section>
      <ResetConsentButton />
    </div>
  )

  return locale === 'de' ? DE : locale === 'en' ? EN : ES
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{n}. {title}</h2>
      {children}
    </section>
  )
}

function Types({ es, de }: { es?: boolean; de?: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{es ? '2. Tipos de cookies que usamos' : de ? '2. Arten von Cookies' : '2. Types of cookies we use'}</h2>
      <ul className="list-disc pl-5 text-white/80">
        <li><b>{es ? 'Técnicas/estrictamente necesarias' : de ? 'Technisch/unbedingt erforderlich' : 'Technical/strictly necessary'}</b>: {es ? 'imprescindibles para navegación, autenticación y seguridad. Incluyen nh-consent. No requieren consentimiento.' : de ? 'für Navigation, Authentifizierung und Sicherheit. Enthalten nh-consent. Keine Einwilligung erforderlich.' : 'required for navigation, authentication and security. Includes nh-consent. No consent required.'}</li>
        <li><b>{es ? 'De preferencia' : de ? 'Präferenzen' : 'Preference'}</b>: {es ? 'recuerdan idioma y ajustes de interfaz.' : de ? 'merken Sprache und Interface‑Einstellungen.' : 'remember language and interface settings.'}</li>
        <li><b>{es ? 'Analíticas' : de ? 'Analytisch' : 'Analytics'}</b>: {es ? 'usamos identificadores propios (nh-device, nh-session) para medir sesiones y pantallas de forma agregada.' : de ? 'wir nutzen eigene IDs (nh-device, nh-session) fuer Sitzungen und Screens in aggregierter Form.' : 'we use first-party IDs (nh-device, nh-session) to measure sessions and screens in aggregate.'}</li>
        <li><b>{es ? 'Publicidad/afiliación' : de ? 'Werbung/Affiliate' : 'Advertising/affiliate'}</b>: {es ? 'algunos enlaces de reserva pueden incluir parámetros de referido.' : de ? 'einige Buchungslinks können Referral‑Parameter enthalten.' : 'some booking links may include referral parameters.'}</li>
      </ul>
    </section>
  )
}
