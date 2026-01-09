"use client"
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

type ShareSheetProps = {
  title?: string | null
  i18n?: Record<string, string> | null
  className?: string
  buttonClassName?: string
}

function safeText(i18n: Record<string, string> | null | undefined, locale: string, fallback?: string | null) {
  if (i18n && typeof i18n === 'object' && i18n[locale]) return i18n[locale]
  return fallback || ''
}

export function ShareSheet({ title, i18n, className, buttonClassName }: ShareSheetProps) {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const shareTitle = useMemo(() => {
    const name = safeText(i18n, locale, title)
    return name ? `${name}` : 'WWG'
  }, [i18n, locale, title])

  const shareText = useMemo(() => {
    const name = safeText(i18n, locale, title)
    return name ? `${name} | WWG` : 'WWG'
  }, [i18n, locale, title])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setUrl(window.location.href)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const encodedUrl = encodeURIComponent(url || '')
  const encodedText = encodeURIComponent(shareText || '')

  const whatsappHref = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`

  const btnCls = buttonClassName || 'btn btn-secondary w-full'

  const handleInstagram = async () => {
    if (!url) return
    setCopied(false)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {}
    window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener')
  }

  const guardLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!url) e.preventDefault()
  }

  const openSheet = () => {
    if (typeof window !== 'undefined') setUrl(window.location.href)
    setOpen(true)
  }

  return (
    <div className={className}>
      <button className={btnCls} onClick={openSheet}>{t('action.share')}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 py-6" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{t('action.share')}</div>
              <button className="text-white/70 hover:text-white" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="mt-3 grid gap-2">
              <a className="btn btn-secondary w-full" href={whatsappHref} onClick={guardLink} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn btn-secondary w-full" onClick={handleInstagram}>Instagram</button>
              <a className="btn btn-secondary w-full" href={facebookHref} onClick={guardLink} target="_blank" rel="noreferrer">Facebook</a>
              <a className="btn btn-secondary w-full" href={twitterHref} onClick={guardLink} target="_blank" rel="noreferrer">X (Twitter)</a>
            </div>
            {copied && (
              <div className="mt-2 text-xs text-green-300">{t('share.copied')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
