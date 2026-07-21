"use client"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Log to help debugging in dev
  if (typeof window !== 'undefined') console.error('App error:', error)
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Ha ocurrido un error</h2>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>{error.message || 'Algo no fue bien.'}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => reset()} style={{ padding: '8px 12px', borderRadius: 8, background: '#D4AF37', color: '#000', fontWeight: 600 }}>Reintentar</button>
        <a href="/" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.2)', textDecoration: 'none', color: 'inherit' }}>Ir al inicio</a>
      </div>
    </div>
  )
}

