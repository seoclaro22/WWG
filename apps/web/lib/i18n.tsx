"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { dictionaries } from '@/lib/dictionaries'

type I18n = {
  locale: string
  setLocale: (l: string) => void
  t: (k: string) => string
}

const I18nCtx = createContext<I18n | null>(null)

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  // El idioma viene de la URL (renderizado en servidor), no de localStorage.
  // Asi el HTML que ve Google ya sale en el idioma correcto.
  const [locale, setLocale] = useState<string>(initialLocale || 'es')

  // Al navegar entre idiomas (/discover -> /en/discover) el contexto se sincroniza.
  useEffect(() => {
    if (initialLocale && initialLocale !== locale) setLocale(initialLocale)
  }, [initialLocale]) // eslint-disable-line react-hooks/exhaustive-deps

  const t = (k: string) => {
    const dict = dictionaries[locale] || dictionaries.es
    return dict[k] || k
  }

  function change(l: string) {
    setLocale(l)
    if (typeof window !== 'undefined') localStorage.setItem('nh-locale', l)
  }

  return <I18nCtx.Provider value={{ locale, setLocale: change, t }}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('I18nProvider missing')
  return ctx
}

export function T({ k }: { k: string }) {
  const { t } = useI18n()
  return <>{t(k)}</>
}
