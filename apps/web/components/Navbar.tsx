"use client"
import { Link } from '@/lib/navigation'
import { LocaleSwitcher } from './LocaleSwitcher'
import { useI18n } from '@/lib/i18n'
import { UserMenu } from './UserMenu'

export function Navbar() {
  const { t } = useI18n()
  return (
    <nav className="sticky top-0 z-20 bg-black/70 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <Link href="/" className="font-semibold tracking-wide text-gold shrink-0">WWG</Link>
        <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm min-w-0">
          <Link className="hover:text-gold shrink-0" href="/discover?tab=events" prefetch={false}>{t('nav.home')}</Link>
          <Link className="flex items-center gap-1 text-gold hover:text-white px-1.5 sm:px-2 py-0.5 rounded-lg border border-gold/30 hover:border-gold bg-gold/5 transition-all text-xs font-semibold shrink-0" href="/map" prefetch={false}>
            <span>{t('nav.map')}</span>
          </Link>
          <Link className="hover:text-gold shrink-0" href="/promote" prefetch={false}>{t('nav.promote')}</Link>
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
