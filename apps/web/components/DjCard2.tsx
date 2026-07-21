"use client"
import { Link } from '@/lib/navigation'
import { SafeImage } from '@/components/SafeImage'
import { FavoriteButton } from './FavoriteButton'
import { LocalText } from './LocalText'
import { useI18n } from '@/lib/i18n'
// Removed Seguir/Quitar button from list cards per request

type Props = {
  dj: {
    id: string
    name: string
    name_i18n?: Record<string, string> | null
    short_bio?: string | null
    short_bio_i18n?: Record<string, string> | null
    bio?: string | null
    bio_i18n?: Record<string, string> | null
    genres?: string[] | null
    image?: string | null
  }
  showHeart?: boolean
}

export function DjCard2({ dj, showHeart = false }: Props) {
  const { locale, t } = useI18n()
  const image = dj.image || null
  const genres = Array.isArray(dj.genres) ? dj.genres : []
  const baseShort = (dj.short_bio || '').trim()
  const shortI18n = dj.short_bio_i18n && typeof dj.short_bio_i18n === 'object' ? (dj.short_bio_i18n as any)[locale] : ''
  const localizedShort = shortI18n || baseShort
  const displayDesc = localizedShort ? (localizedShort.length > 120 ? localizedShort.slice(0, 117) + '...' : localizedShort) : ''
  return (
    <div className="card overflow-hidden relative border border-white/10 bg-white/5 hover:border-[#d8af3a]/40 hover:shadow-[0_0_20px_rgba(216,175,58,0.12)] transition-all duration-200">
      {showHeart && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <FavoriteButton eventId={dj.id} targetType="dj" compact useLocalCache />
        </div>
      )}
      <div className="flex gap-3 p-3 items-start">
        <Link href={`/dj/${dj.id}`} className="w-24 h-24 rounded-lg bg-white/5 shrink-0 block overflow-hidden">
          {image ? (
            <SafeImage src={image} alt={dj.name} width={96} height={96} sizes="96px" className="w-full h-full object-cover object-top" />
          ) : null}
        </Link>
        <div className="flex-1">
          <Link href={`/dj/${dj.id}`} className="font-medium leading-tight hover:text-gold block">
            <LocalText value={dj.name} i18n={dj.name_i18n || undefined} />
          </Link>
          {genres.length > 0 && (
            <div className="text-xs text-white/60 mt-1">{genres.join(', ')}</div>
          )}
          {displayDesc && (
            <div className="text-xs text-white/70 mt-1">
              {displayDesc}
            </div>
          )}
          <div className="mt-2 flex gap-2 flex-wrap">
            <Link href={`/dj/${dj.id}`} className="text-sm px-4 py-1.5 rounded-full bg-[#d8af3a] text-black font-semibold shadow-[0_0_12px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_18px_rgba(216,175,58,0.55)] transition-all">{t('action.view')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
