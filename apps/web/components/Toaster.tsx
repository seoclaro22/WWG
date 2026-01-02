"use client"
import { useEffect, useState } from 'react'

type Toast = { id: number; text: string }

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    function onToast(e: any) {
      const text = e?.detail?.message || String(e?.detail || '')
      if (!text) return
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, text }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('nighthub-toast', onToast as any)
      return () => window.removeEventListener('nighthub-toast', onToast as any)
    }
  }, [])
  if (!toasts.length) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
      <div className="space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="card px-5 py-4 text-sm text-center bg-black/70 border border-white/10 rounded-xl shadow-lg min-w-[240px]">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
