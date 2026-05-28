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
    <div className="card overflow-hidden relative border border-white/10 bg-white/5 hover:border-[#d8af3a]/40 hover:shadow-[0_0_20px_rgba(216,175,58,0.12)] transition-all duration-200">
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
            <Link href={`/club/${club.id}`} className="text-sm px-4 py-1.5 rounded-full bg-[#d8af3a] text-black font-semibold shadow-[0_0_12px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_18px_rgba(216,175,58,0.55)] transition-all">{t('action.view')}</Link>
            <a className="text-sm px-3 py-1 rounded-xl bg-white/8 border border-white/10 text-white/80 hover:bg-white/12 hover:border-[#d8af3a]/40 hover:text-white transition-colors" target="_blank" rel="noreferrer" href={`https://maps.google.com?q=${mapQ}`}>{t('action.directions')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
