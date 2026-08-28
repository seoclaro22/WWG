"use client"
import { Link } from '@/lib/navigation'
import { useI18n } from '@/lib/i18n'

export default function LegalPage() {
  const { locale } = useI18n()

  const ES = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Aviso Legal</h1>
      <p className="muted">De acuerdo con la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos.</p>
      <Section n={1} title="Titular del sitio">
        <ul className="list-disc pl-5 text-white/80">
          <li>Titular: Cristian Romero</li>
          <li>NIF: ESX3543456F</li>
          <li>Domicilio: Can Joi, Puerto de Sóller, Islas Baleares</li>
          <li>Contacto: hola@seoclaro.com</li>
        </ul>
      </Section>
      <Section n={2} title="Objeto"><p>Where We Go es una plataforma de descubrimiento de ocio nocturno (discotecas, fiestas, DJs) que permite consultar agenda de eventos, guardar favoritos, seguir clubs y acceder a enlaces de reserva de terceros.</p></Section>
      <Section n={3} title="Condiciones de uso"><p>El acceso y uso del sitio atribuye la condición de usuario y supone la aceptación de este aviso legal. El usuario se compromete a hacer un uso adecuado del sitio y a no emplearlo para actividades ilícitas.</p></Section>
      <Section n={4} title="Propiedad intelectual e industrial"><p>Los contenidos propios del sitio (textos, diseño, código, logotipos) son titularidad de Where We Go o de terceros que han autorizado su uso, salvo que se indique lo contrario. Las imágenes y nombres de eventos, clubs y DJs pertenecen a sus respectivos titulares.</p></Section>
      <Section n={5} title="Enlaces a terceros"><p>El sitio incluye enlaces de reserva y redes sociales hacia sitios de terceros (clubs, promotoras, plataformas de venta de entradas) sobre los que Where We Go no tiene control ni responsabilidad. El acceso a esos sitios queda sujeto a sus propias condiciones.</p></Section>
      <Section n={6} title="Exclusión de responsabilidad"><p>Where We Go no garantiza la exactitud, vigencia o disponibilidad continua de la información publicada (horarios, precios, line-ups), que depende de los datos facilitados por clubs y promotoras. Se recomienda confirmar los detalles antes de acudir a un evento.</p></Section>
      <Section n={7} title="Protección de datos"><p>El tratamiento de datos personales se describe en la <Link className="underline" href="/privacy">Política de Privacidad</Link> y el uso de cookies en la <Link className="underline" href="/cookies">Política de Cookies</Link>.</p></Section>
      <Section n={8} title="Legislación aplicable"><p>Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan según la normativa de protección de consumidores aplicable.</p></Section>
    </div>
  )

  const EN = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Legal Notice</h1>
      <p className="muted">In accordance with Spanish Law 34/2002 on Information Society Services and Electronic Commerce (LSSI-CE), the following information is provided.</p>
      <Section n={1} title="Site owner">
        <ul className="list-disc pl-5 text-white/80">
          <li>Owner: Cristian Romero</li>
          <li>Tax ID: ESX3543456F</li>
          <li>Registered address: Can Joi, Puerto de Sóller, Balearic Islands</li>
          <li>Contact: hola@seoclaro.com</li>
        </ul>
      </Section>
      <Section n={2} title="Purpose"><p>Where We Go is a nightlife discovery platform (clubs, parties, DJs) that lets you browse an events calendar, save favorites, follow clubs and access third-party booking links.</p></Section>
      <Section n={3} title="Terms of use"><p>Accessing and using this site grants you user status and implies acceptance of this legal notice. Users agree to make appropriate use of the site and not to use it for unlawful activities.</p></Section>
      <Section n={4} title="Intellectual property"><p>The site's own content (text, design, code, logos) belongs to Where We Go or to third parties who have authorized its use, unless stated otherwise. Images and names of events, clubs and DJs belong to their respective owners.</p></Section>
      <Section n={5} title="Third-party links"><p>The site includes booking and social media links to third-party sites (clubs, promoters, ticketing platforms) over which Where We Go has no control or responsibility. Access to those sites is subject to their own terms.</p></Section>
      <Section n={6} title="Disclaimer"><p>Where We Go does not guarantee the accuracy, currency or continuous availability of published information (times, prices, line-ups), which depends on data provided by clubs and promoters. We recommend confirming details before attending an event.</p></Section>
      <Section n={7} title="Data protection"><p>Personal data processing is described in the <Link className="underline" href="/privacy">Privacy Policy</Link> and cookie usage in the <Link className="underline" href="/cookies">Cookie Policy</Link>.</p></Section>
      <Section n={8} title="Applicable law"><p>This legal notice is governed by Spanish law. Any dispute will be submitted to the courts that correspond under applicable consumer protection rules.</p></Section>
    </div>
  )

  const DE = (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Impressum</h1>
      <p className="muted">Gemäß dem spanischen Gesetz 34/2002 über Dienste der Informationsgesellschaft und den elektronischen Geschäftsverkehr (LSSI-CE) werden folgende Angaben veröffentlicht.</p>
      <Section n={1} title="Betreiber der Website">
        <ul className="list-disc pl-5 text-white/80">
          <li>Betreiber: Cristian Romero</li>
          <li>Steuernummer: ESX3543456F</li>
          <li>Anschrift: Can Joi, Puerto de Sóller, Balearen</li>
          <li>Kontakt: hola@seoclaro.com</li>
        </ul>
      </Section>
      <Section n={2} title="Zweck"><p>Where We Go ist eine Plattform zur Entdeckung des Nachtlebens (Clubs, Partys, DJs), mit der du einen Veranstaltungskalender durchsuchen, Favoriten speichern, Clubs folgen und auf Buchungslinks Dritter zugreifen kannst.</p></Section>
      <Section n={3} title="Nutzungsbedingungen"><p>Der Zugriff auf und die Nutzung dieser Website verleiht dir den Status als Nutzer und bedeutet die Annahme dieses Impressums. Nutzer verpflichten sich, die Website angemessen zu nutzen und nicht für rechtswidrige Zwecke zu verwenden.</p></Section>
      <Section n={4} title="Geistiges Eigentum"><p>Die eigenen Inhalte der Website (Texte, Design, Code, Logos) gehören Where We Go oder Dritten, die deren Nutzung genehmigt haben, sofern nicht anders angegeben. Bilder und Namen von Events, Clubs und DJs gehören ihren jeweiligen Inhabern.</p></Section>
      <Section n={5} title="Links zu Dritten"><p>Die Website enthält Buchungs- und Social-Media-Links zu Websites Dritter (Clubs, Veranstalter, Ticketplattformen), über die Where We Go keine Kontrolle oder Verantwortung hat. Der Zugriff auf diese Seiten unterliegt deren eigenen Bedingungen.</p></Section>
      <Section n={6} title="Haftungsausschluss"><p>Where We Go garantiert nicht die Richtigkeit, Aktualität oder ständige Verfügbarkeit der veröffentlichten Informationen (Zeiten, Preise, Line-ups), die von den Angaben der Clubs und Veranstalter abhängen. Wir empfehlen, die Details vor dem Besuch einer Veranstaltung zu bestätigen.</p></Section>
      <Section n={7} title="Datenschutz"><p>Die Verarbeitung personenbezogener Daten wird in der <Link className="underline" href="/privacy">Datenschutzerklärung</Link> beschrieben, die Nutzung von Cookies in der <Link className="underline" href="/cookies">Cookie-Richtlinie</Link>.</p></Section>
      <Section n={8} title="Anwendbares Recht"><p>Dieses Impressum unterliegt spanischem Recht. Streitigkeiten unterliegen den nach geltendem Verbraucherschutzrecht zuständigen Gerichten.</p></Section>
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
