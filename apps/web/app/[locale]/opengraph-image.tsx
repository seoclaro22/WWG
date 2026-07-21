import { ImageResponse } from 'next/og'
import { homeMeta } from '@/lib/seo'
import { routing } from '@/i18n/routing'

export const alt = 'Where We Go'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

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
