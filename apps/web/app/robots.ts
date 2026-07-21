import { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'

const PRIVATE_PATHS = ['/admin', '/account', '/auth', '/tickets', '/favorites']

// Las rutas privadas existen tambien con prefijo de idioma (/en/admin, /de/admin),
// asi que se bloquean todas las variantes.
const PRIVATE = [
  '/api/',
  ...PRIVATE_PATHS,
  ...routing.locales
    .filter((l) => l !== routing.defaultLocale)
    .flatMap((l) => PRIVATE_PATHS.map((p) => `/${l}${p}`)),
]

// Crawlers de IA: permitidos a proposito para aparecer citados en
// ChatGPT, Perplexity, Claude, Gemini y AI Overviews (GEO/AEO).
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_BOTS.map(bot => ({ userAgent: bot, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: 'https://wherewego.site/sitemap.xml',
    host: 'https://wherewego.site',
  }
}
