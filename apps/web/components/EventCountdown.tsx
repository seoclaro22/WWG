"use client"
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

// Mensaje de urgencia bajo el hero: "Empieza en 3 h 20 min", "Hoy", "Mañana"...
// Solo se muestra si el evento empieza en los proximos 7 dias.
export function EventCountdown({ startAt }: { startAt: string }) {
  const { locale } = useI18n()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const start = new Date(startAt).getTime()
  const diffMs = start - now
  if (diffMs <= 0 || diffMs > 7 * 24 * 60 * 60 * 1000) return null

  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  let text: string
  if (locale === 'en') {
    if (hours < 1) text = `Starts in ${mins} min`
    else if (hours < 24) text = `Starts in ${hours} h ${mins % 60} min`
    else if (days === 1) text = 'Starts tomorrow'
    else text = `Starts in ${days} days`
  } else if (locale === 'de') {
    if (hours < 1) text = `Beginnt in ${mins} Min`
    else if (hours < 24) text = `Beginnt in ${hours} Std ${mins % 60} Min`
    else if (days === 1) text = 'Beginnt morgen'
    else text = `Beginnt in ${days} Tagen`
  } else {
    if (hours < 1) text = `Empieza en ${mins} min`
    else if (hours < 24) text = `Empieza en ${hours} h ${mins % 60} min`
    else if (days === 1) text = 'Empieza mañana'
    else text = `Empieza en ${days} dias`
  }

  const urgent = hours < 24

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${
      urgent
        ? 'bg-[#d8af3a]/10 border-[#d8af3a]/30 text-[#d8af3a]'
        : 'bg-white/5 border-white/10 text-white/70'
    }`}>
      {urgent && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d8af3a] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d8af3a]" />
        </span>
      )}
      {text}
    </div>
  )
}
