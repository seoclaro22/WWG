"use client"
import { useI18n } from '@/lib/i18n'

const inputCls = "w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#d8af3a]/60 focus:bg-white/8 transition-colors"

export function InputField({ name, labelKey, placeholderKey, type='text', required=false }: { name: string; labelKey: string; placeholderKey: string; type?: string; required?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t(labelKey)}</label>
      <input name={name} type={type} required={required} className={inputCls} placeholder={t(placeholderKey)} />
    </div>
  )
}

export function TextAreaField({ name, labelKey, placeholderKey, rows=3 }: { name: string; labelKey: string; placeholderKey: string; rows?: number }) {
  const { t } = useI18n()
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{t(labelKey)}</label>
      <textarea name={name} rows={rows} className={`${inputCls} resize-none`} placeholder={t(placeholderKey)} />
    </div>
  )
}
