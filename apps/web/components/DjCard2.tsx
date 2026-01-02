"use client"
import Link from 'next/link'
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
  const baseBio = dj.bio || ''
  const desc = baseShort || (baseBio ? (baseBio.length > 160 ? baseBio.slice(0, 157) + '...' : baseBio) : '')
  const shortI18n = dj.short_bio_i18n && typeof dj.short_bio_i18n === 'object' ? (dj.short_bio_i18n as any)[locale] : ''
  const bioI18n = dj.bio_i18n && typeof dj.bio_i18n === 'object' ? (dj.bio_i18n as any)[locale] : ''
  const localized = shortI18n || bioI18n || ''
  const localizedDesc = localized ? (localized.length > 160 ? localized.slice(0, 157) + '...' : localized) : ''
  const displayDesc = localizedDesc || baseShort || desc
  return (
    <div className="card card-glass overflow-hidden relative">
      {showHeart && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <FavoriteButton eventId={dj.id} targetType="dj" compact useLocalCache />
        </div>
      )}
      <div className="flex gap-3 p-3 items-start">
        <Link href={`/dj/${dj.id}`} className="w-24 h-24 rounded-lg bg-white/5 shrink-0 block overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={dj.name} className="w-full h-full object-cover" />
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
            <Link href={`/dj/${dj.id}`} className="btn btn-primary text-sm px-3 py-1">{t('action.view')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
