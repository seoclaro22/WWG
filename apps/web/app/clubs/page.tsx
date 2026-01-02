import Link from 'next/link'
import { fetchClubsPublic } from '@/lib/db'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'

export default async function ClubsIndex() {
  const clubs = await fetchClubsPublic({ limit: 200 })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Clubs</h1>
      <div className="grid gap-2">
        {clubs.map((c: any) => {
          const images: string[] = Array.isArray(c.images) ? c.images : []
          const cover = images[0]
          return (
            <div key={c.id} className="card p-3 flex items-center gap-3">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={c.name} className="w-24 h-16 object-cover rounded-lg border border-white/10" />
              ) : (
                <div className="w-24 h-16 rounded-lg bg-white/5 border border-white/10" />
              )}
              <div className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-white/70 line-clamp-2">
                  <LocalText value={c.description || '-'} i18n={c.description_i18n || undefined} />
                </div>
                <div className="text-xs text-white/50 mt-1">{c.address || '—'}{c.zone ? ` · ${c.zone}` : ''}</div>
              </div>
              <Link href={`/club/${c.id}`} className="btn btn-secondary"><T k="action.view" /></Link>
            </div>
          )
        })}
        {clubs.length === 0 && <div className="muted">No hay clubs disponibles.</div>}
      </div>
    </div>
  )
}
