"use client"
import { Link } from '@/lib/navigation'
import { LocaleSwitcher } from './LocaleSwitcher'
import { useI18n } from '@/lib/i18n'
import { UserMenu } from './UserMenu'

export function Navbar() {
  const { t } = useI18n()
  return (
    <nav className="sticky top-0 z-20 backdrop-blur bg-black/30 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-wide text-gold">WWG</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link className="hover:text-gold" href="/discover?tab=events" prefetch={false}>{t('nav.home')}</Link>
          <Link className="flex items-center gap-1 text-[#00f0ff] hover:text-white px-2 py-0.5 rounded-lg border border-[#00f0ff]/30 hover:border-[#00f0ff] bg-[#00f0ff]/5 transition-all text-xs font-semibold" href="/map" prefetch={false}>
            <span>🗺️</span>
            <span>{t('nav.map')}</span>
          </Link>
          <Link className="hover:text-gold" href="/promote" prefetch={false}>{t('nav.promote')}</Link>
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
