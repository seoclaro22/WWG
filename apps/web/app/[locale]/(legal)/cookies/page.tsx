"use client"
import { ResetConsentButton } from '@/components/CookieConsent'
import { useI18n } from '@/lib/i18n'

export default function CookiesPage() {
  const { locale } = useI18n()

  const ES = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Politica de Cookies</h1>
      <p className="muted">
        Esta politica describe que cookies usamos en WWG (Where We Go), para que sirven y
        como puedes gestionarlas. Algunas cookies son necesarias para el funcionamiento de la web;
        otras solo se activan si aceptas.
      </p>
      <Section n={1} title="Que son las cookies?">
        <p>
          Archivos pequenos que se almacenan en tu dispositivo cuando navegas. Permiten recordar
          preferencias, mantener la sesion o realizar analitica agregada.
        </p>
      </Section>
      <Types es />
      <Section n={3} title="Duracion">
        <p>
          Las cookies de consentimiento y analitica propia se guardan hasta 180 dias. Las cookies
          de Google Analytics se guardan segun la configuracion de Google (normalmente hasta 2 anos).
          Puedes borrarlas antes en cualquier momento.
        </p>
      </Section>
      <Section n={4} title="Como borrar o cambiar cookies">
        <ul className="list-disc pl-5 text-white/80">
          <li>Configura tu navegador para aceptar, bloquear o eliminar cookies.</li>
          <li>Borra las cookies del sitio desde la configuracion de privacidad del navegador.</li>
          <li>Usa el boton de reconfigurar preferencias al final de esta pagina.</li>
        </ul>
      </Section>
      <Section n={5} title="Guias por navegador">
        <ul className="list-disc pl-5 text-white/80">
          <li><a className="underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Chrome</a></li>
          <li><a className="underline" href="https://support.apple.com/es-es/HT201265" target="_blank" rel="noreferrer">Safari</a></li>
          <li><a className="underline" href="https://support.mozilla.org/es/kb/borra-las-cookies-y-los-datos-del-sitio-" target="_blank" rel="noreferrer">Firefox</a></li>
          <li><a className="underline" href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noreferrer">Edge</a></li>
        </ul>
      </Section>
      <Section n={6} title="Terceros">
        <p>
          Usamos Google Analytics si aceptas cookies de analitica. Al seguir enlaces de venta de
          entradas u otros servicios, esos terceros pueden instalar sus propias cookies.
        </p>
      </Section>
      <Section n={7} title="Actualizaciones">
        <p>Podemos actualizar esta politica. Te avisaremos si hay cambios importantes.</p>
      </Section>
      <ResetConsentButton />
    </div>
  )

  const EN = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cookie Policy</h1>
      <p className="muted">
        This policy explains which cookies we use on WWG (Where We Go), what they do, and how you
        can manage them. Some cookies are necessary; others are only enabled if you accept.
      </p>
      <Section n={1} title="What are cookies?">
        <p>
          Small files stored on your device while browsing. They help remember preferences, keep
          sessions, or run aggregated analytics.
        </p>
      </Section>
      <Types />
      <Section n={3} title="Duration">
        <p>
          Consent and first-party analytics cookies are stored up to 180 days. Google Analytics
          cookies are stored according to Google settings (usually up to 2 years). You can delete
          them at any time.
        </p>
      </Section>
      <Section n={4} title="How to delete or change cookies">
        <ul className="list-disc pl-5 text-white/80">
          <li>Configure your browser to accept, block, or delete cookies.</li>
          <li>Remove site cookies from your browser privacy settings.</li>
          <li>Use the reset preferences button at the bottom of this page.</li>
        </ul>
      </Section>
      <Section n={5} title="Browser guides">
        <ul className="list-disc pl-5 text-white/80">
          <li><a className="underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Chrome</a></li>
          <li><a className="underline" href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noreferrer">Safari</a></li>
          <li><a className="underline" href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noreferrer">Firefox</a></li>
          <li><a className="underline" href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noreferrer">Edge</a></li>
        </ul>
      </Section>
      <Section n={6} title="Third parties">
        <p>
          We use Google Analytics if you accept analytics cookies. When you follow ticketing or
          other service links, those third parties may set their own cookies.
        </p>
      </Section>
      <Section n={7} title="Updates">
        <p>We may update this policy and will notify you of material changes.</p>
      </Section>
      <ResetConsentButton />
    </div>
  )

  const DE = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cookie-Richtlinie</h1>
      <p className="muted">
        Diese Richtlinie erklaert, welche Cookies wir bei WWG (Where We Go) verwenden, wozu sie
        dienen und wie du sie verwalten kannst. Einige Cookies sind notwendig; andere werden nur
        gesetzt, wenn du zustimmst.
      </p>
      <Section n={1} title="Was sind Cookies?">
        <p>
          Kleine Dateien, die beim Surfen auf deinem Geraet gespeichert werden. Sie merken sich
          Einstellungen, halten Sitzungen oder ermoeglichen aggregierte Analysen.
        </p>
      </Section>
      <Types de />
      <Section n={3} title="Dauer">
        <p>
          Einwilligungs- und First-Party-Analytics-Cookies werden bis zu 180 Tage gespeichert.
          Google Analytics Cookies werden gemaess Google-Einstellungen gespeichert (meist bis zu 2 Jahren).
          Du kannst sie jederzeit loeschen.
        </p>
      </Section>
      <Section n={4} title="Cookies loeschen oder aendern">
        <ul className="list-disc pl-5 text-white/80">
          <li>Stelle deinen Browser so ein, dass er Cookies akzeptiert, blockiert oder loescht.</li>
          <li>Entferne Cookies dieser Seite in den Browser-Datenschutzeinstellungen.</li>
          <li>Nutze den Button zum Zuruecksetzen der Cookie-Praeferenzen am Ende der Seite.</li>
        </ul>
      </Section>
      <Section n={5} title="Browser-Anleitungen">
        <ul className="list-disc pl-5 text-white/80">
          <li><a className="underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Chrome</a></li>
          <li><a className="underline" href="https://support.apple.com/de-de/HT201265" target="_blank" rel="noreferrer">Safari</a></li>
          <li><a className="underline" href="https://support.mozilla.org/de/kb/cookies-und-website-daten-in-firefox-loschen" target="_blank" rel="noreferrer">Firefox</a></li>
          <li><a className="underline" href="https://support.microsoft.com/de-de/microsoft-edge/cookies-in-microsoft-edge-loschen-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noreferrer">Edge</a></li>
        </ul>
      </Section>
      <Section n={6} title="Dritte">
        <p>
          Wir nutzen Google Analytics, wenn du Analytics-Cookies akzeptierst. Wenn du zu Ticketing
          oder anderen Diensten weitergehst, koennen diese Drittanbieter eigene Cookies setzen.
        </p>
      </Section>
      <Section n={7} title="Aktualisierungen">
        <p>Wir koennen diese Richtlinie aktualisieren und informieren dich bei wichtigen Aenderungen.</p>
      </Section>
      <ResetConsentButton />
    </div>
  )

  return locale == 'de' ? DE : locale == 'en' ? EN : ES
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
      <h2 className="font-medium">{es ? '2. Cookies que instalamos' : de ? '2. Cookies, die wir setzen' : '2. Cookies we set'}</h2>
      <ul className="list-disc pl-5 text-white/80">
        <li><b>{es ? 'Necesarias' : de ? 'Notwendig' : 'Necessary'}</b>: {es ? 'nh-consent (guarda tu eleccion de cookies).' : de ? 'nh-consent (speichert deine Cookie-Wahl).' : 'nh-consent (stores your cookie choice).'}</li>
        <li><b>{es ? 'Analitica propia (solo si aceptas)' : de ? 'Eigene Analytik (nur bei Einwilligung)' : 'First-party analytics (only if you accept)'}</b>: {es ? 'nh-device, nh-session, nh-session-ts, nh-session-start para medir sesiones y pantallas.' : de ? 'nh-device, nh-session, nh-session-ts, nh-session-start fuer Sitzungen und Screens.' : 'nh-device, nh-session, nh-session-ts, nh-session-start for sessions and screens.'}</li>
        <li><b>{es ? 'Google Analytics (solo si aceptas)' : de ? 'Google Analytics (nur bei Einwilligung)' : 'Google Analytics (only if you accept)'}</b>: {es ? '_ga, _ga_G-G9QL4BMH1N para medicion de uso y rendimiento.' : de ? '_ga, _ga_G-G9QL4BMH1N fuer Nutzung und Leistung.' : '_ga, _ga_G-G9QL4BMH1N for usage and performance measurement.'}</li>
      </ul>
    </section>
  )
}
