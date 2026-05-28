"use client"
import { useState } from 'react'

export function ClubDescriptionExpand({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n').filter(Boolean)
  const isLong = text.length > 180

  return (
    <div>
      <p className={`text-sm text-white/70 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs text-[#d8af3a] font-medium hover:text-[#e8c85a] transition-colors"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}
