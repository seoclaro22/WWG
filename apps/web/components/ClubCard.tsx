"use client"
import Link from 'next/link'
import { FavoriteButton } from './FavoriteButton'
import { useI18n } from '@/lib/i18n'
// Removed Seguir/Quitar button from list cards per request

type Props = {
  club: { id: string; name: string; address?: string | null; zone?: string | null; image?: string | null }
  showHeart?: boolean
}

export function ClubCard({ club, showHeart = false }: Props) {
  const { t } = useI18n()
  const mapQ = encodeURIComponent(club.address || club.name)
  return (
    <div className="card card-glass overflow-hidden relative">
      {showHeart && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <FavoriteButton eventId={club.id} targetType="club" compact useLocalCache />
        </div>
      )}
      <div className="flex gap-3 p-3 items-start">
        <Link href={`/club/${club.id}`} className="w-24 h-24 rounded-lg bg-white/5 shrink-0 block overflow-hidden">
          {club.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
          ) : null}
        </Link>
        <div className="flex-1">
          <Link href={`/club/${club.id}`} className="font-medium leading-tight hover:text-gold block">{club.name}</Link>
          <div className="text-sm text-white/70">{club.address || '-'}</div>
          {club.zone && <div className="text-xs text-white/60">{club.zone}</div>}
          <div className="mt-2 flex gap-2 flex-wrap">
            <Link href={`/club/${club.id}`} className="btn btn-primary text-sm px-3 py-1">{t('action.view')}</Link>
            <a className="btn btn-primary text-sm px-3 py-1" target="_blank" rel="noreferrer" href={`https://maps.google.com?q=${mapQ}`}>{t('action.directions')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
