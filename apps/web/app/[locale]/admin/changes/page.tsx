"use client"
import { AdminGuard } from '@/components/admin/AdminGuard'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

type Cambio = {
  id: string
  target_type: 'dj' | 'club'
  target_id: string
  field: string
  old_value: any
  new_value: any
  kind: 'direct' | 'review'
  status: string
  created_at: string
  reviewed_at: string | null
}

const FILTROS = [
  { key: 'pending', label: 'Por revisar' },
  { key: 'applied', label: 'Aplicados' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
  { key: 'reverted', label: 'Revertidos' },
  { key: 'todos', label: 'Todos' },
] as const

export default function AdminChangesPage() {
  return (
    <AdminGuard>
      <ChangesManager />
    </AdminGuard>
  )
}

function ChangesManager() {
  const [items, setItems] = useState<Cambio[]>([])
  const [filtro, setFiltro] = useState<string>('pending')
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    let q = sb().from('profile_changes').select('*').order('created_at', { ascending: false }).limit(200)
    if (filtro !== 'todos') q = q.eq('status', filtro)
    const { data, error: err } = await q
    if (err) { setError(err.message); return }
    const filas = (data || []) as Cambio[]
    setItems(filas)
    setError(null)

    const djIds = filas.filter(f => f.target_type === 'dj').map(f => f.target_id)
    const clubIds = filas.filter(f => f.target_type === 'club').map(f => f.target_id)
    const mapa: Record<string, string> = {}
    if (djIds.length) {
      const { data: d } = await sb().from('djs').select('id,name').in('id', djIds)
      for (const x of d || []) mapa[x.id] = x.name
    }
    if (clubIds.length) {
      const { data: c } = await sb().from('clubs').select('id,name').in('id', clubIds)
      for (const x of c || []) mapa[x.id] = x.name
    }
    setNombres(mapa)
  }, [filtro])

  useEffect(() => { load() }, [load])

  async function resolver(id: string, aprobar: boolean) {
    setOcupado(id); setError(null)
    const notas = aprobar ? null : (prompt('Motivo del rechazo (opcional)') || null)
    const { error: err } = await sb().rpc('resolve_profile_change', {
      p_change_id: id, p_aprobar: aprobar, p_notas: notas,
    })
    if (err) setError(err.message)
    await load()
    setOcupado(null)
  }

  async function revertir(id: string) {
    if (!confirm('Se devolvera el campo a su valor anterior. Continuar?')) return
    setOcupado(id); setError(null)
    const { error: err } = await sb().rpc('revert_profile_change', { p_change_id: id })
    if (err) setError(err.message)
    await load()
    setOcupado(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Cambios de perfiles</h1>
        <Link href="/admin" className="text-sm text-white/50 hover:text-white">Volver</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filtro === key
                ? 'bg-[#d8af3a] text-black font-semibold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {items.length === 0 && (
        <p className="text-sm text-white/50 py-8 text-center">No hay cambios en este estado.</p>
      )}

      <div className="space-y-2">
        {items.map((c) => {
          const nombre = nombres[c.target_id] || '(ficha no encontrada)'
          const url = c.target_type === 'dj' ? `/dj/${c.target_id}` : `/club/${c.target_id}`
          return (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                  {c.target_type}
                </span>
                <a href={url} target="_blank" rel="noreferrer" className="font-medium text-white hover:text-[#d8af3a]">
                  {nombre}
                </a>
                <span className="text-sm text-white/50">·</span>
                <span className="text-sm font-mono text-[#d8af3a]">{c.field}</span>
                {c.kind === 'direct' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/20 text-white/60">
                    edicion directa
                  </span>
                )}
                <span className="text-xs text-white/35 ml-auto">
                  {new Date(c.created_at).toLocaleString('es-ES')}
                </span>
              </div>

              {/* Antes y despues uno encima de otro y no lado a lado: en un
                  movil dos columnas dejan los textos largos ilegibles. */}
              <div className="space-y-2">
                <Valor label="Antes" valor={c.old_value} tono="text-white/50" />
                <Valor label="Despues" valor={c.new_value} tono="text-white/90" />
              </div>

              <div className="flex gap-2 flex-wrap">
                {c.status === 'pending' && (
                  <>
                    <button
                      disabled={ocupado === c.id}
                      onClick={() => resolver(c.id, true)}
                      className="px-4 py-2 rounded-full bg-[#199e70] text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Aprobar y aplicar
                    </button>
                    <button
                      disabled={ocupado === c.id}
                      onClick={() => resolver(c.id, false)}
                      className="px-4 py-2 rounded-full border border-[#d03b3b]/40 text-[#d03b3b] text-sm disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {(c.status === 'applied' || c.status === 'approved') && (
                  <button
                    disabled={ocupado === c.id}
                    onClick={() => revertir(c.id)}
                    className="px-4 py-2 rounded-full border border-white/15 text-white/80 text-sm disabled:opacity-50"
                  >
                    Revertir
                  </button>
                )}
                {['rejected', 'reverted'].includes(c.status) && (
                  <span className="text-sm text-white/40 py-2">
                    {c.status === 'rejected' ? 'Rechazado' : 'Revertido'}
                    {c.reviewed_at ? ` el ${new Date(c.reviewed_at).toLocaleDateString('es-ES')}` : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Valor({ label, valor, tono }: { label: string; valor: any; tono: string }) {
  const texto =
    valor == null ? '(vacio)'
    : typeof valor === 'string' ? valor
    : JSON.stringify(valor, null, 2)
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-white/35 font-semibold">{label}</p>
      <pre className={`text-sm whitespace-pre-wrap break-words font-sans ${tono}`}>{texto}</pre>
    </div>
  )
}
