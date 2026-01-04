"use client"
import { useI18n } from '@/lib/i18n'

export function LDate({ value, options, timeZone }: { value: string | number | Date; options?: Intl.DateTimeFormatOptions; timeZone?: string }) {
  const { locale } = useI18n()
  const map: Record<string, string> = { es: 'es-ES', en: 'en-GB', de: 'de-DE' }
  const fmt = new Date(value)
  const resolved = timeZone ? { ...options, timeZone } : options
  const text = fmt.toLocaleString(map[locale] || 'es-ES', resolved)
  return <>{text}</>
}
