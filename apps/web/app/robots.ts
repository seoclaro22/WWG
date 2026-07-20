import { MetadataRoute } from 'next'

const PRIVATE = ['/admin', '/account', '/api/', '/auth', '/tickets', '/favorites']

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
