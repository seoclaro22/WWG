"use client"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

const OPTIONS = ['today', 'tomorrow', 'weekend'] as const

export function QuickDateChips() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { t } = useI18n()
  const current = params.get('date') ?? ''

  function toggle(value: string) {
    const sp = new URLSearchParams(params as any)
    if (current === value) sp.delete('date')
    else sp.set('date', value)
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {OPTIONS.map(opt => {
        const active = current === opt
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              active
                ? 'bg-[#d8af3a] text-black border-[#d8af3a] shadow-[0_0_16px_rgba(216,175,58,0.4)]'
                : 'bg-white/5 text-white/70 border-white/10 hover:border-[#d8af3a]/40 hover:text-white'
            }`}
          >
            {t(`date.${opt}`)}
          </button>
        )
      })}
    </div>
  )
}
