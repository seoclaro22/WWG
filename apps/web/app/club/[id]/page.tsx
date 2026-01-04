import Link from 'next/link'
import { fetchClub, fetchClubEvents } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/FavoriteButton'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'

export default async function ClubProfile({ params }: { params: { id: string } }) {
  const club: any = await fetchClub(params.id)
  if (!club) return notFound()
  const events = await fetchClubEvents(params.id, 10)
  let images: string[] = []; if (Array.isArray((club as any).images)) { images = (club as any).images as string[] } else if (typeof (club as any).images === "string") { try { const parsed = JSON.parse((club as any).images as string); if (Array.isArray(parsed)) images = parsed; else if (typeof parsed === "string") images = [parsed]; } catch { if ((club as any).images) images = [String((club as any).images)] } }
  const logo: string | null = (club as any).logo_url || null
  const links = (club.links || {}) as Record<string, string>
  const mapUrl = club.address ? `https://maps.google.com?q=${encodeURIComponent(club.address)}` : (club.name ? `https://maps.google.com?q=${encodeURIComponent(club.name)}` : '#')
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-4">
      <div className="w-full rounded-xl bg-white/5 overflow-hidden aspect-[3/1]">
        {(images[0] || (club as any).logo_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(images[0] || (club as any).logo_url) as string} alt={club.name} className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex items-start gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="logo" className="w-12 h-12 rounded-full border border-white/10 object-cover" />
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{club.name}</h1>
            <FavoriteButton eventId={club.id} targetType="club" useLocalCache />
          </div>
          <p className="muted">
            <LocalText value={club.description || '-'} i18n={club.description_i18n || undefined} />
          </p>
          {Array.isArray(club.genres) && club.genres.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {club.genres.map((g: string) => (
                <span key={g} className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <div className="card p-4">
          <div className="text-sm text-white/80 break-words">{club.address || 'Mallorca'}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn btn-primary text-sm px-3 py-1" href={mapUrl} target="_blank" rel="noreferrer"><T k="action.directions" /></a>
            {/* telefono privado: no se muestra en publico */}
            {links?.web && <a className="btn btn-primary text-sm px-3 py-1" href={links.web} target="_blank" rel="noreferrer">Web</a>}
            {links?.instagram && <a className="btn btn-primary text-sm px-3 py-1" href={links.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {links?.facebook && <a className="btn btn-primary text-sm px-3 py-1" href={links.facebook} target="_blank" rel="noreferrer">Facebook</a>}
          </div>
        </div>
        {images.length > 1 && (
          <div className="card p-3">
            <div className="flex gap-2 overflow-auto">
              {images.slice(1).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`img-${i}`} className="w-28 h-20 object-cover rounded-lg border border-white/10" />
              ))}
            </div>
          </div>
        )}
        <div className="card p-3">
          <div className="font-medium mb-2">Proximos Eventos</div>
          <div className="space-y-2">
            {events.length === 0 && <div className="text-sm text-white/60">No hay eventos proximos.</div>}
            {events.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between">
                <div className="text-sm">{e.name} · {new Date(e.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</div>
                <Link className="btn btn-secondary px-3 py-1 text-sm" href={`/event/${e.id}`}><T k="action.view" /></Link>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}


export const revalidate = 0
export const dynamic = 'force-dynamic'
