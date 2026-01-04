"use client"
import Link from 'next/link'
import { ReserveButton } from './ReserveButton'
import { FavoriteButton } from './FavoriteButton'
import { useI18n } from '@/lib/i18n'
import { LocalText } from './LocalText'

type Props = {
  event: { id: string; title: string; title_i18n?: Record<string,string>; date: string; club: string; image?: string }
  showHeart?: boolean
}

export function EventCard({ event, showHeart = false }: Props) {
  const { t } = useI18n()
  return (
    <div className="card card-glass overflow-hidden relative">
      {showHeart && (
        <div className="absolute top-2 right-2 z-30 pointer-events-auto">
          <FavoriteButton eventId={event.id} targetType="event" compact useLocalCache />
        </div>
      )}
      <div className="flex gap-3 p-3">
        <Link href={`/event/${event.id}`} className="shrink-0 block">
          {event.image ? (
            <img src={event.image} alt={event.title} className="w-24 h-24 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-white/5" />
          )}
        </Link>
        <div className="flex-1">
          <Link href={`/event/${event.id}`} className="font-medium leading-tight hover:text-gold block"><LocalText value={event.title} i18n={event.title_i18n} /></Link>
          <div className="text-sm text-white/70">{event.club}</div>
          <div className="text-xs text-white/60">{event.date}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ReserveButton eventId={event.id} source="discover" className="w-full sm:w-auto">{t('action.reserve')}</ReserveButton>
            <a className="btn btn-primary text-sm px-3 py-1 w-full sm:w-auto text-center" target="_blank" href={`https://maps.google.com?q=${encodeURIComponent(event.club)}`}>{t('action.directions')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
