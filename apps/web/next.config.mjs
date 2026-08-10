import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Host del storage propio, del que salen las unicas imagenes que pasan por el
// optimizador (ver components/SafeImage.tsx: las de CDNs ajenos se sirven
// directas con unoptimized, asi que no necesitan estar aqui).
//
// Antes esto era hostname '**', que dejaba a cualquiera meter su URL por
// /_next/image y usar el optimizador como CDN gratis a cargo de la cuota.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

// La CSP necesita el origen completo, y ademas el equivalente en wss: el cliente
// de Supabase abre un websocket para realtime y auth.
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : ''
const supabaseWsOrigin = supabaseHost ? `wss://${supabaseHost}` : ''

// Politica de contenido, ya en modo bloqueo (no Report-Only). Se probo antes
// sin bloquear en home, discover, ficha de DJ y login sin ningun aviso en
// consola, y los origenes de Spotify/Analytics se verificaron contra el
// codigo real (components/GoogleAnalytics.tsx, app/[locale]/dj/[id]/page.tsx).
//
// 'unsafe-inline' en script-src es necesario mientras el JSON-LD se inyecte con
// dangerouslySetInnerHTML; quitarlo exige pasar a nonces desde el middleware.
//
// 'unsafe-eval' solo en desarrollo: el webpack de "next dev" carga cada modulo
// con eval() para el hot-reload, y sin esto la CSP lo bloquea entero, en
// silencio (cero fetches, cero hidratacion, sin ningun aviso claro en
// consola). El build de produccion no usa eval, asi que alli no hace falta y
// no se relaja.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // gtag se carga desde googletagmanager (components/GoogleAnalytics.tsx)
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  // blob: y data: los usa el canvas WebGL del fondo y las previsualizaciones
  // de imagen antes de subirlas
  `img-src 'self' data: blob: https:`,
  "font-src 'self' data:",
  // Supabase (datos, auth y realtime por websocket) y la analitica.
  //
  // Los dominios de analitica van con comodin porque GA4 no envia siempre a
  // www.google-analytics.com: reparte por endpoints regionales
  // (region1.google-analytics.com y siguientes) segun donde este el visitante.
  // Con el dominio fijo, el navegador bloqueaba por CSP practicamente todas
  // las visitas europeas, que son casi todo el trafico del sitio.
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`,
  // Spotify se incrusta en las fichas de DJ
  "frame-src https://open.spotify.com",
  "upgrade-insecure-requests",
].join('; ')

const SECURITY_HEADERS = [
  // Sin esto la web se puede incrustar en un iframe ajeno y superponer botones
  // encima de los nuestros (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), interest-cohort=()' },
  // 2 anios. El navegador recuerda que este dominio es solo https y no permite
  // el degradado a http ni saltarse el aviso de certificado.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: CSP },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // La cabecera que delata version de framework no aporta nada al usuario y si
  // le ahorra trabajo a quien busca objetivos por version conocida.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  images: {
    // Redimensionado en Supabase y no en el optimizador de Vercel: ese tiene
    // un tope de 5000 transformaciones al mes y al agotarse devuelve 402, que
    // en produccion se veia como imagenes rotas. Ver lib/image-loader.ts.
    //
    // Con loader propio no se proxya nada, asi que remotePatterns deja de
    // hacer falta: ya no hay una ruta /_next/image que alguien pueda usar de
    // CDN gratis a nuestra cuenta.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
};

export default withNextIntl(nextConfig);
