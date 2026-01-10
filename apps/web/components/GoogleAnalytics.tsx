"use client"
import Script from 'next/script'
import { useEffect, useState } from 'react'

const GA_ID = 'G-G9QL4BMH1N'
const CONSENT_KEY = 'nh-consent'

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

function hasConsent() {
  try {
    const stored = localStorage.getItem(CONSENT_KEY) || getCookie(CONSENT_KEY)
    return stored === 'accepted'
  } catch {
    return getCookie(CONSENT_KEY) === 'accepted'
  }
}

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const check = () => setEnabled(hasConsent())
    check()
    const onConsent = () => check()
    window.addEventListener('nh-consent-changed', onConsent)
    return () => window.removeEventListener('nh-consent-changed', onConsent)
  }, [])

  if (!enabled) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  )
}
