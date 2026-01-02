"use client"
import Link from 'next/link'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type TopItem = { id: string; name: string; count: number; type?: string }
type LatestUser = { id: string; email?: string | null; display_name?: string | null; created_at?: string | null }

function sb(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

export default function AdminStatsPage(){
  return (
    <AdminGuard>
      <StatsInner />
    </AdminGuard>
  )
}

function StatsInner(){
  const [preset, setPreset] = useState<'7d'|'30d'|'90d'|'all'>('7d')
  const [from, setFrom] = useState<string>('') // YYYY-MM-DD
  const [to, setTo] = useState<string>('')
  const [favTop, setFavTop] = useState<TopItem[]>([])
  const [favEvents, setFavEvents] = useState<TopItem[]>([])
  const [favClubs, setFavClubs] = useState<TopItem[]>([])
  const [favDjs, setFavDjs] = useState<TopItem[]>([])
  const [clickTop, setClickTop] = useState<TopItem[]>([])
  const [searchTop, setSearchTop] = useState<{ term: string; count: number }[]>([])
  const [zoneTop, setZoneTop] = useState<{ zone: string; count: number }[]>([])
  const [djsSearched, setDjsSearched] = useState<TopItem[]>([])
  const [activeUsers, setActiveUsers] = useState(0)
  const [latestUsers, setLatestUsers] = useState<LatestUser[]>([])
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string|undefined>()

  useEffect(() => { load() }, [preset, from, to])

  async function load(){
    setBusy(true); setErr(undefined)
    const client = sb()
    try {
      const { fromIso, toIso } = buildRange()
      const activeUsersPromise = (async () => {
        const seen = new Set<string>()
        const collect = async (table: string, col: string) => {
          let q = client.from(table).select(`user_id,${col}`)
          if (fromIso) q = (q as any).gte(col, fromIso)
          if (toIso) q = (q as any).lte(col, toIso)
          const { data, error } = await q
          if (error) return
          for (const r of (data || []) as any[]) {
            if (r.user_id) seen.add(r.user_id)
          }
        }
        await Promise.all([
          collect('favorites', 'created_at'),
          collect('clicks', 'ts'),
          collect('reviews', 'created_at'),
          collect('follows', 'created_at'),
        ])
        return seen.size
      })()
      const latestUsersPromise = (async () => {
        const { data, error } = await client
          .from('users')
          .select('id,email,display_name,created_at')
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) return [] as LatestUser[]
        return (data || []) as LatestUser[]
      })()
      // Favorites top (club/event/dj) - aggregate on client for simplicity
      let favQ = client.from('favorites').select('target_type,target_id,created_at')
      if (fromIso) favQ = (favQ as any).gte('created_at', fromIso)
      if (toIso) favQ = (favQ as any).lte('created_at', toIso)
      const favRes = await favQ
      const favRows = favRes.data || []
      const agg = new Map<string,{type:string,id:string,count:number}>()
      for (const r of favRows as any[]) {
        const key = `${r.target_type}:${r.target_id}`
        const cur = agg.get(key) || { type: r.target_type, id: r.target_id, count: 0 }
        cur.count++; agg.set(key, cur)
      }
      const list = Array.from(agg.values()).sort((a,b)=>b.count-a.count).slice(0,10)
      // Resolve names per type
      const names = new Map<string,string>()
      const byType: Record<string,string[]> = { event: [], club: [], dj: [] }
      for (const i of list){ byType[i.type]?.push(i.id) }
      if (byType.event.length){
        const { data } = await client.from('events_public').select('id,name').in('id', byType.event)
        for (const r of (data||[])) names.set(r.id, r.name)
      }
      if (byType.club.length){
        const { data } = await client.from('clubs').select('id,name').in('id', byType.club)
        for (const r of (data||[])) names.set(r.id, r.name)
      }
      if (byType.dj.length){
        const { data } = await client.from('djs').select('id,name').in('id', byType.dj)
        for (const r of (data||[])) names.set(r.id, r.name)
      }
      const withNames = list.map(i => ({ id: i.id, name: names.get(i.id) || i.id, count: i.count, type: i.type }))
      setFavTop(withNames)
      setFavEvents(withNames.filter(x=>x.type==='event'))
      setFavClubs(withNames.filter(x=>x.type==='club'))
      setFavDjs(withNames.filter(x=>x.type==='dj'))

      // Clicks (reservas) top por evento
      let clkQ = client.from('clicks').select('event_id,ts')
      if (fromIso) clkQ = (clkQ as any).gte('ts', fromIso)
      if (toIso) clkQ = (clkQ as any).lte('ts', toIso)
      const clk = await clkQ
      const cAgg = new Map<string,number>()
      for (const r of (clk.data||[]) as any[]){ if (r.event_id){ cAgg.set(r.event_id, (cAgg.get(r.event_id)||0)+1) } }
      const cTop = Array.from(cAgg.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10)
      const cIds = cTop.map(t => t[0])
      const evNames = new Map<string,string>()
      if (cIds.length){
        const { data } = await client.from('events_public').select('id,name').in('id', cIds)
        for (const r of (data||[])) evNames.set(r.id, r.name)
      }
      setClickTop(cTop.map(([id,count]) => ({ id, name: evNames.get(id)||id, count })))

      // Search terms top
      let sQ = client.from('search_logs').select('q,zone,ts,tab')
      if (fromIso) sQ = (sQ as any).gte('ts', fromIso)
      if (toIso) sQ = (sQ as any).lte('ts', toIso)
      const sRes = await sQ
      const sAgg = new Map<string,number>()
      for (const r of (sRes.data||[]) as any[]){
        const term = (r.q||'').toString().trim().toLowerCase(); if (term){ sAgg.set(term, (sAgg.get(term)||0)+1) }
      }
      setSearchTop(Array.from(sAgg.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([term,count])=>({term,count})))

      // Zones top (por busquedas)
      const zAgg = new Map<string,number>()
      for (const r of (sRes.data||[]) as any[]){ const z=(r.zone||'').toString().trim(); if (z){ zAgg.set(z,(zAgg.get(z)||0)+1) } }
      setZoneTop(Array.from(zAgg.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([zone,count])=>({zone,count})))

      // DJs mas buscados (por pestaña djs)
      const dAgg = new Map<string,number>()
      for (const r of (sRes.data||[]) as any[]){ if ((r.tab||'')==='djs'){ const t=(r.q||'').toString().trim().toLowerCase(); if (t){ dAgg.set(t,(dAgg.get(t)||0)+1) } } }
      const dTerms = Array.from(dAgg.entries()).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([t])=>t)
      if (dTerms.length){
        const orCond = dTerms.map(t=>`name.ilike.%${t.replace(/[%_,]/g, ' ').trim()}%`).join(',')
        const djRes = await client.from('djs').select('id,name').or(orCond)
        const djCounts = new Map<string, { id:string; name:string; count:number }>()
        for (const dj of (djRes.data||[]) as any[]){
          const lname = (dj.name||'').toString().toLowerCase()
          let sum = 0
          for (const [term,count] of Array.from(dAgg.entries())){ if (lname.includes(term)) sum += count }
          if (sum>0) djCounts.set(dj.id, { id:dj.id, name:dj.name, count: sum })
        }
        const top = Array.from(djCounts.values()).sort((a,b)=>b.count-a.count).slice(0,10)
        setDjsSearched(top)
      } else {
        setDjsSearched([])
      }

      const [activeCount, newestUsers] = await Promise.all([activeUsersPromise, latestUsersPromise])
      setActiveUsers(activeCount)
      setLatestUsers(newestUsers)
    } catch(e:any){
      setErr(e?.message || 'Error cargando estadisticas')
      setFavTop([]); setFavEvents([]); setFavClubs([]); setFavDjs([])
      setClickTop([]); setSearchTop([]); setZoneTop([]); setDjsSearched([])
      setActiveUsers(0); setLatestUsers([])
    } finally {
      setBusy(false)
    }
  }

  function buildRange(){
    let f = from, t = to
    if (preset !== 'all'){
      const now = new Date()
      const d = new Date()
      const days = preset==='7d'?7:preset==='30d'?30:90
      d.setDate(now.getDate() - days)
      f = toDateInput(d)
      t = toDateInput(now)
    }
    const fromIso = f ? new Date(`${f}T00:00:00Z`).toISOString() : ''
    const toIso = t ? new Date(`${t}T23:59:59Z`).toISOString() : ''
    return { fromIso, toIso }
  }

  function toDateInput(d: Date){
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth()+1).padStart(2,'0')
    const day = String(d.getUTCDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn btn-secondary">Volver</Link>
        </div>
        <div className="flex items-center gap-2">
          <select value={preset} onChange={e=>setPreset(e.target.value as any)} className="bg-base-card border border-white/10 rounded-xl p-2 text-sm">
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
            <option value="all">Todo</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="bg-base-card border border-white/10 rounded-xl p-2 text-sm" />
          <span className="text-sm">a</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="bg-base-card border border-white/10 rounded-xl p-2 text-sm" />
        </div>
      </div>
      {busy && <div className="muted">Cargando...</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      {!busy && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="font-medium mb-2">Usuarios activos</div>
            <div className="text-3xl font-semibold">{activeUsers}</div>
            <div className="text-xs text-white/60">Periodo seleccionado</div>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Ultimos 20 usuarios</div>
            <ul className="space-y-1 text-sm">
              {latestUsers.map(u => (
                <li key={u.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{u.display_name || u.email || u.id}</span>
                  <span className="text-white/60 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : ''}</span>
                </li>
              ))}
              {latestUsers.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Top Favoritos (todo)</div>
            <ul className="space-y-1 text-sm">
              {favTop.map((i,idx)=>{
                const max = favTop[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.type+':'+i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. [{i.type}] {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {favTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Favoritos - Eventos</div>
            <ul className="space-y-1 text-sm">
              {favEvents.map((i,idx)=>{
                const max = favEvents[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {favEvents.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Favoritos - Clubs</div>
            <ul className="space-y-1 text-sm">
              {favClubs.map((i,idx)=>{
                const max = favClubs[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {favClubs.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Favoritos - DJs</div>
            <ul className="space-y-1 text-sm">
              {favDjs.map((i,idx)=>{
                const max = favDjs[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {favDjs.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Top Reservas (clicks a entradas)</div>
            <ul className="space-y-1 text-sm">
              {clickTop.map((i,idx)=>{
                const max = clickTop[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {clickTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Busquedas mas frecuentes</div>
            <ul className="space-y-1 text-sm">
              {searchTop.map((i,idx)=>(<li key={i.term} className="flex justify-between">
                <span>{idx+1}. {i.term}</span>
                <span className="text-white/60">{i.count}</span>
              </li>))}
              {searchTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">Zonas mas usadas</div>
            <ul className="space-y-1 text-sm">
              {zoneTop.map((i,idx)=>(<li key={i.zone} className="flex justify-between">
                <span>{idx+1}. {i.zone}</span>
                <span className="text-white/60">{i.count}</span>
              </li>))}
              {zoneTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
          <div className="card p-4">
            <div className="font-medium mb-2">DJs mas buscados</div>
            <ul className="space-y-1 text-sm">
              {djsSearched.map((i,idx)=>{
                const max = djsSearched[0]?.count || 1
                const pct = Math.round((i.count/max)*100)
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{idx+1}. {i.name}</span>
                      <span className="text-white/60">{i.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded">
                      <div className="h-2 bg-gold rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
              {djsSearched.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
