import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/api/', '/auth', '/tickets', '/favorites'],
      },
    ],
    sitemap: 'https://www.wherewego.site/sitemap.xml',
  }
}
