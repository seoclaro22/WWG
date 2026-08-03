"use client"
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useEffect, useMemo, useState } from 'react'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() {
  return supabaseBrowser
}

type Props = {
  value: string[]
  onChange: (g: string[]) => void
  allowCreate?: boolean
}

export function GenreSelect({ value, onChange, allowCreate }: Props) {
  const [all, setAll] = useState<{ id: string; name: string }[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    sb().from('genres').select('id,name').order('name').then(({ data }) => setAll(data || []))
  }, [])

  const filtered = useMemo(() => {
    if (!q) return all
    const qq = q.toLowerCase()
    return all.filter(g => g.name.toLowerCase().includes(qq))
  }, [q, all])

  async function createGenre(name: string) {
    if (!name.trim()) return
    setLoading(true)
    const clean = name.trim().replace(/\s+/g,' ').replace(/^.|.$/g, (s)=>s)
    const { data, error } = await sb().from('genres').insert({ name: clean }).select('id,name').maybeSingle()
    setLoading(false)
    if (error) { alert('No se pudo crear el género: ' + error.message); return }
    if (data) {
      setAll(prev => [...prev, data])
      if (!value.includes(data.name)) onChange([...value, data.name])
      setQ('')
    }
  }

  function toggle(name: string, checked: boolean) {
    if (checked) onChange([...value, name])
    else onChange(value.filter(v => v !== name))
  }

  const canCreate = allowCreate && q.trim().length >= 2 && !all.some(g => g.name.toLowerCase() === q.trim().toLowerCase())

  return (
    <div className="space-y-2">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar o crear género..." className="w-full bg-transparent border border-white/10 rounded-xl p-2 text-sm" />
      {canCreate && (
        <button type="button" disabled={loading} className="btn btn-secondary text-sm" onClick={()=>createGenre(q)}>
          {loading ? 'Creando...' : `Crear "${q.trim()}"`}
        </button>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-auto p-2 border border-white/10 rounded-xl">
        {filtered.map(g => (
          <label key={g.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(g.name)} onChange={e=>toggle(g.name, e.target.checked)} />
            <span>{g.name}</span>
          </label>
        ))}
        {filtered.length === 0 && <div className="text-sm text-white/60">Sin resultados</div>}
      </div>
      {value.length > 0 && (
        <div className="text-xs text-white/60">Seleccionados: {value.join(', ')}</div>
      )}
    </div>
  )
}

