import Link from 'next/link'
import { fetchDj, fetchDjEvents, fetchSimilarDjs } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { LDate } from '@/components/LDate'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'

export default async function DjProfile({ params }: { params: { id: string } }) {
  const dj = await fetchDj(params.id)
  if (!dj) return notFound()
  const events = await fetchDjEvents(params.id, 10)
  const similar = await fetchSimilarDjs(params.id, (dj as any).genres || [], 1)
  const images: string[] = Array.isArray((dj as any).images) ? (dj as any).images : []
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-4">
      <div className="aspect-[3/4] w-full rounded-xl bg-white/5 overflow-hidden">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={(dj as any).name} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">
            <LocalText value={(dj as any).name} i18n={(dj as any).name_i18n || undefined} />
          </h1>
          <FavoriteButton eventId={params.id} targetType="dj" useLocalCache />
        </div>
        <p className="muted">
          <LocalText value={(dj as any).bio || '-'} i18n={(dj as any).bio_i18n || undefined} />
        </p>
        {Array.isArray((dj as any).genres) && (dj as any).genres.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {(dj as any).genres.map((g: string) => (
              <span key={g} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{g}</span>
            ))}
          </div>
        )}
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2"><T k="dj.upcoming" /></div>
        <div className="space-y-2">
          {events.length === 0 && (
            <div className="text-sm text-white/60"><T k="dj.no_upcoming" /></div>
          )}
          {events.map(e => (
            <Link key={e.id} href={`/event/${e.id}`} className="flex items-center justify-between text-sm hover:text-gold">
              <span>{e.name}</span>
              <span className="text-white/60">
                <LDate value={(e as any).start_at} options={{ day: '2-digit', month: 'short' }} /> · {(e as any).club_name}
              </span>
            </Link>
          ))}
        </div>
      </div>
      {similar && similar.length > 0 && (
        <div className="card p-4">
          <div className="font-medium mb-2"><T k="dj.similar" /></div>
          <div className="flex items-center justify-between text-sm">
            <Link href={`/dj/${(similar[0] as any).id}`} className="hover:text-gold flex items-center gap-3">
              {(Array.isArray((similar[0] as any).images) && (similar[0] as any).images[0]) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(similar[0] as any).images[0]} alt={(similar[0] as any).name} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
              ) : <div className="w-12 h-12 rounded-lg bg-white/5" />}
              <span className="font-medium">{(similar[0] as any).name}</span>
            </Link>
            <Link href={`/dj/${(similar[0] as any).id}`} className="btn btn-secondary px-3 py-1 text-sm"><T k="action.view" /></Link>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}


export const revalidate = 0
export const dynamic = 'force-dynamic'


