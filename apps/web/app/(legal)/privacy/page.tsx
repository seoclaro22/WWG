"use client"
import { useI18n } from '@/lib/i18n'

export default function PrivacyPage() {
  const { locale } = useI18n()

  const ES = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Política de Privacidad</h1>
      <p className="muted">Esta política explica cómo tratamos tus datos personales cuando usas Where We Go (la “Plataforma”). Cumplimos el Reglamento (UE) 2016/679 (RGPD) y la normativa española vigente.</p>
      <Section n={1} title="Responsable"><p>Responsable: Cristian Felipe Romero San Martín (Where We Go). Contacto: info@seoclaro.com</p></Section>
      <Section n={2} title="Datos que tratamos">
        <ul className="list-disc pl-5 text-white/80">
          <li>Identificación: email, nombre a mostrar y preferencias de idioma.</li>
          <li>Uso de la app: favoritos, clubs seguidos, reseñas, clics de reserva (atribución anónima salvo sesión iniciada).</li>
          <li>Datos técnicos: IP abreviada, dispositivo/navegador, cookies técnicas/analíticas.</li>
        </ul>
      </Section>
      <Section n={3} title="Finalidades">
        <ul className="list-disc pl-5 text-white/80">
          <li>Prestar el servicio: descubrir eventos, guardar favoritos, seguir clubs y gestionar tu cuenta.</li>
          <li>Mejora del producto y analítica agregada.</li>
          <li>Comunicaciones sobre cambios relevantes y seguridad.</li>
          <li>Moderación de contenidos.</li>
        </ul>
      </Section>
      <Section n={4} title="Base legal">
        <ul className="list-disc pl-5 text-white/80">
          <li>Ejecución del contrato/servicio (art. 6.1.b RGPD).</li>
          <li>Interés legítimo en seguridad, fraude y mejora (art. 6.1.f RGPD).</li>
          <li>Consentimiento para cookies no esenciales y comunicaciones comerciales (art. 6.1.a RGPD).</li>
        </ul>
      </Section>
      <Section n={5} title="Conservación"><p>Conservamos datos mientras tengas cuenta o sea necesario. Puedes borrar tus datos desde “Cuenta”. Registros legales se guardan el tiempo exigido.</p></Section>
      <Section n={6} title="Cesiones y encargados"><p>No vendemos tus datos. Usamos proveedores como encargados (hosting/BD con garantías adecuadas). En webs de terceros aplican sus políticas.</p></Section>
      <Section n={7} title="Derechos"><p>Acceso, rectificación, supresión, oposición, limitación y portabilidad: info@seoclaro.com. Reclama ante la AEPD si procede.</p></Section>
      <Section n={8} title="Seguridad"><p>Medidas técnicas/organizativas: cifrado en tránsito, control de accesos y RLS en base de datos.</p></Section>
      <Section n={9} title="Menores"><p>Plataforma para mayores de 18 años. Si detectamos una cuenta de un menor, la desactivamos y eliminamos los datos.</p></Section>
      <Section n={10} title="Cambios"><p>Podemos actualizar esta política y avisaremos por medios razonables si los cambios son significativos.</p></Section>
    </div>
  )

  const EN = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="muted">This policy explains how we process your personal data when you use Where We Go (the “Platform”). We comply with EU Regulation 2016/679 (GDPR) and applicable Spanish law.</p>
      <Section n={1} title="Controller"><p>Controller: Cristian Felipe Romero San Martín (Where We Go). Contact: info@seoclaro.com</p></Section>
      <Section n={2} title="Data we process">
        <ul className="list-disc pl-5 text-white/80">
          <li>Identification: email, display name and language preference.</li>
          <li>App usage: favorites, followed clubs, reviews, referral clicks (anonymous unless you are signed in).</li>
          <li>Technical: truncated IP, device/browser type, technical/analytics cookies.</li>
        </ul>
      </Section>
      <Section n={3} title="Purposes">
        <ul className="list-disc pl-5 text-white/80">
          <li>Provide the service: discover events, save favorites, follow clubs and manage your account.</li>
          <li>Product improvement and aggregated analytics.</li>
          <li>Service and security communications.</li>
          <li>Content moderation.</li>
        </ul>
      </Section>
      <Section n={4} title="Legal basis">
        <ul className="list-disc pl-5 text-white/80">
          <li>Performance of a contract/service you request (Art. 6(1)(b) GDPR).</li>
          <li>Legitimate interest in security, fraud prevention and product improvement (Art. 6(1)(f) GDPR).</li>
          <li>Consent for non‑essential cookies and marketing communications (Art. 6(1)(a) GDPR).</li>
        </ul>
      </Section>
      <Section n={5} title="Retention"><p>We keep data while you have an account or as needed. You can delete your data from “Account”. Legal/operational logs are retained as required by law.</p></Section>
      <Section n={6} title="Sharing and processors"><p>We do not sell your data. We use processors (e.g., hosting/DB in the EU/EEA or with adequate safeguards). Third‑party ticket sites have their own policies.</p></Section>
      <Section n={7} title="Your rights"><p>Access, rectification, erasure, objection, restriction and portability: info@seoclaro.com. You may lodge a complaint with your DPA.</p></Section>
      <Section n={8} title="Security"><p>We apply appropriate technical and organizational measures (transport encryption, access control, DB RLS).</p></Section>
      <Section n={9} title="Children"><p>The Platform is intended for users aged 18+. Accounts of minors will be disabled and data removed.</p></Section>
      <Section n={10} title="Changes"><p>We may update this policy and will notify you when changes are significant.</p></Section>
    </div>
  )

  const DE = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>
      <p className="muted">Diese Richtlinie erläutert, wie wir deine personenbezogenen Daten verarbeiten, wenn du Where We Go (die „Plattform“) nutzt. Wir halten die DSGVO (EU 2016/679) und geltendes spanisches Recht ein.</p>
      <Section n={1} title="Verantwortlicher"><p>Verantwortlicher: Cristian Felipe Romero San Martín (Where We Go). Kontakt: info@seoclaro.com</p></Section>
      <Section n={2} title="Welche Daten verarbeiten wir">
        <ul className="list-disc pl-5 text-white/80">
          <li>Identifikation: E‑Mail, Anzeigename und Sprache.</li>
          <li>Nutzung der App: Favoriten, gefolgte Clubs, Bewertungen, Ticket‑Klicks (anonym, sofern du nicht angemeldet bist).</li>
          <li>Technisch: gekürzte IP‑Adresse, Gerät/Browser, technische/analytische Cookies.</li>
        </ul>
      </Section>
      <Section n={3} title="Zwecke">
        <ul className="list-disc pl-5 text-white/80">
          <li>Bereitstellung des Dienstes: Events entdecken, Favoriten speichern, Clubs folgen und dein Konto verwalten.</li>
          <li>Produktverbesserung und aggregierte Analyse.</li>
          <li>Mitteilungen zu Dienständerungen und Sicherheit.</li>
          <li>Inhaltsmoderation.</li>
        </ul>
      </Section>
      <Section n={4} title="Rechtsgrundlagen">
        <ul className="list-disc pl-5 text-white/80">
          <li>Vertrag/Service, den du anforderst (Art. 6 Abs. 1 lit. b DSGVO).</li>
          <li>Berechtigtes Interesse an Sicherheit, Betrugsprävention und Verbesserung (Art. 6 Abs. 1 lit. f DSGVO).</li>
          <li>Einwilligung für nicht notwendige Cookies und Werbemitteilungen (Art. 6 Abs. 1 lit. a DSGVO).</li>
        </ul>
      </Section>
      <Section n={5} title="Speicherdauer"><p>Wir speichern Daten solange dein Konto existiert oder es notwendig ist. Du kannst deine Daten unter „Konto“ löschen. Gesetzliche Protokolle bewahren wir entsprechend auf.</p></Section>
      <Section n={6} title="Weitergabe/Auftragsverarbeiter"><p>Wir verkaufen keine Daten. Wir nutzen Auftragsverarbeiter (z. B. Hosting/DB in der EU/EWR oder mit geeigneten Garantien). Bei Drittseiten gelten deren Richtlinien.</p></Section>
      <Section n={7} title="Betroffenenrechte"><p>Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung, Datenübertragbarkeit: info@seoclaro.com. Du kannst dich bei der zuständigen Aufsichtsbehörde beschweren.</p></Section>
      <Section n={8} title="Sicherheit"><p>Wir setzen angemessene technische und organisatorische Maßnahmen ein (Transportverschlüsselung, Zugriffskontrolle, DB‑RLS).</p></Section>
      <Section n={9} title="Minderjährige"><p>Die Plattform richtet sich an Personen ab 18 Jahren. Konten Minderjähriger werden deaktiviert und Daten gelöscht.</p></Section>
      <Section n={10} title="Änderungen"><p>Wir können diese Richtlinie aktualisieren und informieren dich bei wesentlichen Änderungen.</p></Section>
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
