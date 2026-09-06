"use client"
import { Link } from '@/lib/navigation'
import { SafeImage } from '@/components/SafeImage'
import { FavoriteButton } from './FavoriteButton'
import { VerifiedBadge } from './VerifiedBadge'
import { useI18n } from '@/lib/i18n'
import { clubPath } from '@/lib/hrefs'
// Removed Seguir/Quitar button from list cards per request

type Props = {
  club: { id: string; slug?: string | null; name: string; address?: string | null; zone?: string | null; image?: string | null; verified?: boolean | null }
  showHeart?: boolean
}

export function ClubCard({ club, showHeart = false }: Props) {
  const { t } = useI18n()
  const mapQ = encodeURIComponent(club.address || club.name)
  const ruta = clubPath(club)
  return (
    <div className="card overflow-hidden relative border border-white/10 bg-white/5 hover:border-[#d8af3a]/40 hover:shadow-[0_0_20px_rgba(216,175,58,0.12)] transition-all duration-200">
      {showHeart && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <FavoriteButton eventId={club.id} targetType="club" compact useLocalCache />
        </div>
      )}
      <div className="flex gap-3 p-3 items-start">
        <Link href={ruta} className="w-24 h-24 rounded-lg bg-white/5 shrink-0 block overflow-hidden">
          {club.image ? (
            <SafeImage src={club.image} alt={club.name} width={96} height={96} sizes="96px" className="w-full h-full object-cover" />
          ) : null}
        </Link>
        <div className="flex-1">
          <Link href={ruta} className="font-medium leading-tight hover:text-gold block">
            {club.name}
            {club.verified && <> <VerifiedBadge size="sm" /></>}
          </Link>
          <div className="text-sm text-white/70">{club.address || '-'}</div>
          {club.zone && <div className="text-xs text-white/60">{club.zone}</div>}
          <div className="mt-2 flex gap-2 flex-wrap">
            <Link href={ruta} className="text-sm px-4 py-1.5 rounded-full bg-[#d8af3a] text-black font-semibold shadow-[0_0_12px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_18px_rgba(216,175,58,0.55)] transition-all">{t('action.view')}</Link>
            <a className="text-sm px-3 py-1 rounded-xl bg-white/8 border border-white/10 text-white/80 hover:bg-white/12 hover:border-[#d8af3a]/40 hover:text-white transition-colors flex items-center gap-1.5" target="_blank" rel="noreferrer" href={`https://maps.google.com?q=${mapQ}`}>
              <svg className="w-3.5 h-3.5 text-[#d8af3a] shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 16 C7 16 2 10 2 6 C2 3.24 4.24 1 7 1 C9.76 1 12 3.24 12 6 C12 10 7 16 7 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
              {t('action.directions')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
