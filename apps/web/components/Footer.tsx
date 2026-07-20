import Link from 'next/link'
import { fetchZonesMap } from '@/lib/db'
import { getSupabaseClient } from '@/lib/supabase'

async function fetchActiveGenres() {
  const sb = getSupabaseClient()
  const { data } = await sb.from('genres').select('name').eq('status', 'active').order('name').limit(200)
  return (data || []).map((g: any) => g.name as string)
}

export async function Footer() {
  const [zonesMap, genres] = await Promise.all([fetchZonesMap(), fetchActiveGenres()])
  const zones = Array.from(zonesMap.entries())

  return (
    <footer className="mt-10 border-t border-white/10 py-8 text-sm text-white/50">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {zones.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">Zonas</p>
            <ul className="space-y-1">
              {zones.map(([slug, name]) => (
                <li key={slug}>
                  <Link href={`/${slug}`} className="hover:text-gold" prefetch={false}>{name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {genres.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">Generos</p>
            <ul className="space-y-1">
              {genres.map((name) => (
                <li key={name}>
                  <Link href={`/genre/${encodeURIComponent(name)}`} className="hover:text-gold" prefetch={false}>{name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d8af3a]/70 mb-2">Where We Go</p>
          <ul className="space-y-1">
            <li><Link href="/promote" className="hover:text-gold" prefetch={false}>Promocionar</Link></li>
            <li><Link href="/privacy" className="hover:text-gold" prefetch={false}>Privacidad</Link></li>
            <li><Link href="/cookies" className="hover:text-gold" prefetch={false}>Cookies</Link></li>
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">© {new Date().getFullYear()} Where We Go</p>
    </footer>
  )
}
