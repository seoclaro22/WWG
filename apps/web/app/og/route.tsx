import { ImageResponse } from 'next/og'

// Imagen de compartir para las paginas de listado (zona, hoy, fin de semana,
// zona x genero, genero, cerca de mi). Las fichas de evento, club y DJ ya
// comparten su propia foto; estas no tenian ninguna y caian en la imagen
// generica de la portada, que no dice de que ciudad ni de que dia va.
//
// Es una ruta con parametros y no un opengraph-image.tsx por carpeta porque
// son seis rutas con el mismo diseno: asi hay un solo sitio que mantener.
//
// Vive en /og y no en /api/og porque robots.txt bloquea /api/, y una imagen
// de compartir bloqueada al rastreo no la puede leer Google.
//
// Satori (el motor de next/og) solo admite un subconjunto de CSS: todo
// contenedor con varios hijos necesita display flex explicito.

export const runtime = 'edge'

const GOLD = '#d8af3a'
const INK = '#07060a'

// Recorta sin partir palabras, para que un titulo largo no desborde el lienzo.
function clamp(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max).replace(/\s+\S*$/, '')}...`
}

export function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const eyebrow = clamp(searchParams.get('eyebrow') || 'Where We Go', 40)
  const title = clamp(searchParams.get('title') || 'Where We Go', 70)
  const subtitle = clamp(searchParams.get('subtitle') || '', 90)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          backgroundColor: INK,
          backgroundImage: `radial-gradient(circle at 18% 12%, rgba(216,175,58,0.26) 0%, rgba(7,6,10,0) 58%)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 10, color: GOLD, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: title.length > 40 ? 64 : 82,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
              color: '#ffffff',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: 'flex', marginTop: 24, fontSize: 32, color: 'rgba(255,255,255,0.66)' }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 96, height: 5, backgroundColor: GOLD }} />
          <div style={{ display: 'flex', marginLeft: 24, fontSize: 30, letterSpacing: 8, color: '#ffffff' }}>
            WHERE WE GO
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
