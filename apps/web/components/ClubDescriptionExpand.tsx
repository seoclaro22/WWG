"use client"
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

type Props = {
  text: string
  i18n?: Record<string, string> | null
}

export function ClubDescriptionExpand({ text, i18n }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { locale, t } = useI18n()

  const localizedText = (i18n && i18n[locale]) || text
  const isLong = localizedText.length > 180

  return (
    <div>
      <p className={`text-sm text-white/70 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {localizedText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs text-[#d8af3a] font-medium hover:text-[#e8c85a] transition-colors"
        >
          {expanded ? t('action.show_less') : t('action.show_more')}
        </button>
      )}
    </div>
  )
}
