"use client"
import Link from 'next/link'
import { FavoriteButton } from './FavoriteButton'
import { LocalText } from './LocalText'
import { useI18n } from '@/lib/i18n'

type Props = {
  dj: { id: string; name: string; name_i18n?: Record<string,string> | null; short_bio?: string | null; short_bio_i18n?: Record<string,string> | null; bio?: string | null; bio_i18n?: Record<string,string> | null; genres?: string[] | null; image?: string | null }
}

export function DjCard({ dj }: Props) {
  const { t } = useI18n()
  const image = dj.image || null
  const genres = Array.isArray(dj.genres) ? dj.genres : []
  const desc = (dj.short_bio && dj.short_bio.trim().length) ? dj.short_bio.trim() : (dj.bio ? (dj.bio.length > 160 ? dj.bio.slice(0,157) + '…' : dj.bio) : '')
  return (
    <div className="card card-glass overflow-hidden relative">
      <div className="absolute top-2 right-2 z-30 pointer-events-auto">
        <FavoriteButton eventId={dj.id} targetType="dj" compact />
      </div>
      <div className="flex gap-3 p-3 items-start">
        <Link href={`/dj/${dj.id}`} className="w-24 h-24 rounded-lg bg-white/5 shrink-0 block overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt=<LocalText value={dj.name} i18n={dj.name_i18n||undefined} /> className="w-full h-full object-cover" />
          ) : null}
        </Link>
        <div className="flex-1">
          <Link href={`/dj/${dj.id}`} className="font-medium leading-tight hover:text-gold block"><LocalText value={dj.name} i18n={dj.name_i18n||undefined} /></Link>
          {genres.length > 0 && (
            <div className="text-xs text-white/60 mt-1">{genres.join(', ')}</div>
          )}
          {desc && <div className="text-xs text-white/70 mt-1"><LocalText value={(dj.short_bio||desc)} i18n={dj.short_bio_i18n || dj.bio_i18n || undefined} /></div>}
          <div className="mt-2 flex gap-2">
            <Link href={`/dj/${dj.id}`} className="btn btn-secondary text-sm px-3 py-1">{t('action.view')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

