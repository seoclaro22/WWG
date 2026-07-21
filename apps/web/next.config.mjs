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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
};

export default withNextIntl(nextConfig);
