import { ImageResponse } from 'next/og'
import { homeMeta } from '@/lib/seo'
import { routing } from '@/i18n/routing'

export const alt = 'Where We Go'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// runtime edge y no nodejs (el por defecto de esta convencion de fichero).
//
// Sin esto, "next build" intenta prerenderizar la imagen en Node durante la
// compilacion, y el modulo nativo de @vercel/og hace fileURLToPath() sobre una
// ruta que en este equipo lleva un espacio (Mi unidad); en Windows esa
// conversion revienta con "TypeError: Invalid URL" y el build entero falla.
// route.tsx en apps/web/app/og ya usaba edge por el mismo motivo y ahi nunca
// dio problema. Con edge, Next.js no prerenderiza esta ruta: se genera en cada
// peticion, cacheada por la CDN igual que antes; son tres imagenes que solo
// piden los buscadores y las redes al compartir, sin coste real.
export const runtime = 'edge'

// Imagen que se ve al compartir el sitio en WhatsApp, Instagram o X.
// Satori (el motor de next/og) solo admite un subconjunto de CSS: todo
// contenedor con varios hijos necesita display flex explicito.
export default function OpengraphImage({ params }: { params: { locale: string } }) {
  const { tagline } = homeMeta(params.locale)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07060a',
          backgroundImage:
            'radial-gradient(circle at 50% 35%, rgba(216,175,58,0.22) 0%, rgba(7,6,10,0) 60%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -4,
            color: '#ffffff',
          }}
        >
          WWG
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 8,
            fontSize: 38,
            letterSpacing: 18,
            color: '#d8af3a',
          }}
        >
          WHERE WE GO
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 34,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            width: 220,
            height: 5,
            backgroundColor: '#d8af3a',
          }}
        />
      </div>
    ),
    size,
  )
}
