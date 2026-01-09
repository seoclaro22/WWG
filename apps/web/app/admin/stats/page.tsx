"use client"
import Link from 'next/link'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type TopItem = { id: string; name: string; count: number; type?: string }
type LatestUser = { id: string; email?: string | null; display_name?: string | null; created_at?: string | null }
type Bucket = { label: string; count: number }
type ScreenStat = { screen: string; views: number; avgMs: number; bounceRate: number }
type EventStat = { id: string; name: string; views: number; avgMs: number; clicks: number; ctr: number }
type ActivityRange = { label: string; days: number; activeUsers: number; avgDaily: number; sessions: number; avgSessionMs: number; newDevices: number; returningDevices: number }
type LastActive = { label: string; ts: string; path?: string }

function sb(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

function keyFor(userId?: string | null, deviceId?: string | null) {
  if (userId) return `u:${userId}`
  if (deviceId) return `d:${deviceId}`
  return 'unknown'
}

function dayKey(ts: string) {
  return ts.slice(0, 10)
}

function avg(values: number[]) {
  if (!values.length) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round(sum / values.length)
}

function formatMs(ms: number) {
  if (!ms || ms < 0) return '0m'
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return '<1m'
  return `${minutes}m`
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
  const [avgSessionMsRange, setAvgSessionMsRange] = useState(0)
  const [latestUsers, setLatestUsers] = useState<LatestUser[]>([])
  const [totals, setTotals] = useState({ users: 0, anonDevices: 0, sessions: 0, views: 0 })
  const [lastUser, setLastUser] = useState<LatestUser | null>(null)
  const [lastActive, setLastActive] = useState<LastActive | null>(null)
  const [activityRanges, setActivityRanges] = useState<ActivityRange[]>([])
  const [screenTop, setScreenTop] = useState<ScreenStat[]>([])
  const [eventTop, setEventTop] = useState<EventStat[]>([])
  const [deviceTypes, setDeviceTypes] = useState<Bucket[]>([])
  const [osStats, setOsStats] = useState<Bucket[]>([])
  const [langStats, setLangStats] = useState<Bucket[]>([])
  const [realtime, setRealtime] = useState({ activeUsers: 0, activeSessions: 0, screens: [] as Bucket[], events: [] as Bucket[] })
  const [conversion, setConversion] = useState({ registrations: 0, regRate: 0, clickRate: 0 })
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string|undefined>()

  useEffect(() => { load() }, [preset, from, to])

  async function load(){
    setBusy(true); setErr(undefined)
    const client = sb()
    try {
      const { fromIso, toIso } = buildRange()
      const now = Date.now()
      const yearIso = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()
      const realtimeIso = new Date(now - 2 * 60 * 1000).toISOString()

      const latestUsersPromise = client
        .from('users')
        .select('id,email,display_name,created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      const usersCountPromise = client
        .from('users')
        .select('id', { count: 'exact', head: true })

      const anonDevicesPromise = client
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .is('user_id', null)

      let sessionsRangeQ = client
        .from('app_sessions')
        .select('id,device_id,user_id,started_at,last_seen_at,duration_ms,is_new_device,device_type,os,lang')
      if (fromIso) sessionsRangeQ = (sessionsRangeQ as any).gte('last_seen_at', fromIso)
      if (toIso) sessionsRangeQ = (sessionsRangeQ as any).lte('last_seen_at', toIso)

      let viewsQ = client
        .from('app_page_views')
        .select('id,screen,path,event_id,duration_ms,started_at')
      if (fromIso) viewsQ = (viewsQ as any).gte('started_at', fromIso)
      if (toIso) viewsQ = (viewsQ as any).lte('started_at', toIso)

      let clicksQ = client
        .from('clicks')
        .select('event_id,ts')
      if (fromIso) clicksQ = (clicksQ as any).gte('ts', fromIso)
      if (toIso) clicksQ = (clicksQ as any).lte('ts', toIso)

      let registrationsQ = client
        .from('users')
        .select('id', { count: 'exact', head: true })
      if (fromIso) registrationsQ = (registrationsQ as any).gte('created_at', fromIso)
      if (toIso) registrationsQ = (registrationsQ as any).lte('created_at', toIso)

      const sessionsYearPromise = client
        .from('app_sessions')
        .select('device_id,user_id,last_seen_at,started_at,duration_ms,is_new_device')
        .gte('last_seen_at', yearIso)

      const lastActivePromise = client
        .from('app_sessions')
        .select('user_id,device_id,last_seen_at,current_path')
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const realtimePromise = client
        .from('app_sessions')
        .select('id,device_id,user_id,current_path,current_event_id,last_seen_at')
        .gte('last_seen_at', realtimeIso)

      const [
        latestUsersRes,
        usersCountRes,
        anonDevicesRes,
        sessionsRangeRes,
        viewsRes,
        clicksRes,
        registrationsRes,
        sessionsYearRes,
        lastActiveRes,
        realtimeRes
      ] = await Promise.all([
        latestUsersPromise,
        usersCountPromise,
        anonDevicesPromise,
        sessionsRangeQ,
        viewsQ,
        clicksQ,
        registrationsQ,
        sessionsYearPromise,
        lastActivePromise,
        realtimePromise
      ])

      const latest = (latestUsersRes.data || []) as LatestUser[]
      setLatestUsers(latest)
      setLastUser(latest[0] || null)

      const sessionRows = (sessionsRangeRes.data || []) as any[]
      const viewRows = (viewsRes.data || []) as any[]
      const clickRows = (clicksRes.data || []) as any[]

      setTotals({
        users: usersCountRes.count || 0,
        anonDevices: anonDevicesRes.count || 0,
        sessions: sessionRows.length,
        views: viewRows.length
      })

      const activeSet = new Set<string>()
      for (const r of sessionRows) {
        activeSet.add(keyFor(r.user_id, r.device_id))
      }
      setActiveUsers(activeSet.size)

      const rangeDurations = sessionRows.map(r => Number(r.duration_ms || 0)).filter(n => n > 0)
      setAvgSessionMsRange(avg(rangeDurations))

      const sessionsYear = (sessionsYearRes.data || []) as any[]
      const ranges: ActivityRange[] = [
        { label: '1 dia', days: 1, activeUsers: 0, avgDaily: 0, sessions: 0, avgSessionMs: 0, newDevices: 0, returningDevices: 0 },
        { label: '7 dias', days: 7, activeUsers: 0, avgDaily: 0, sessions: 0, avgSessionMs: 0, newDevices: 0, returningDevices: 0 },
        { label: '30 dias', days: 30, activeUsers: 0, avgDaily: 0, sessions: 0, avgSessionMs: 0, newDevices: 0, returningDevices: 0 },
        { label: '365 dias', days: 365, activeUsers: 0, avgDaily: 0, sessions: 0, avgSessionMs: 0, newDevices: 0, returningDevices: 0 }
      ]
      const rangeStats = ranges.map((range) => {
        const cutoff = now - range.days * 24 * 60 * 60 * 1000
        const list = sessionsYear.filter(r => new Date(r.last_seen_at).getTime() >= cutoff)
        const active = new Set<string>()
        const dayMap = new Map<string, Set<string>>()
        const deviceSet = new Set<string>()
        const newDeviceSet = new Set<string>()
        const durations = [] as number[]
        for (const r of list) {
          active.add(keyFor(r.user_id, r.device_id))
          if (r.device_id) deviceSet.add(r.device_id)
          if (r.is_new_device && r.device_id) newDeviceSet.add(r.device_id)
          if (r.duration_ms) durations.push(Number(r.duration_ms || 0))
          if (r.last_seen_at) {
            const dk = dayKey(r.last_seen_at)
            const s = dayMap.get(dk) || new Set<string>()
            s.add(keyFor(r.user_id, r.device_id))
            dayMap.set(dk, s)
          }
        }
        const dailyCounts = Array.from(dayMap.values()).map(s => s.size)
        const avgDaily = avg(dailyCounts)
        return {
          ...range,
          activeUsers: active.size,
          avgDaily,
          sessions: list.length,
          avgSessionMs: avg(durations),
          newDevices: newDeviceSet.size,
          returningDevices: Math.max(0, deviceSet.size - newDeviceSet.size)
        }
      })
      setActivityRanges(rangeStats)

      const screenAgg = new Map<string, { views: number; durations: number[]; bounces: number }>()
      let eventViewTotal = 0
      const eventAgg = new Map<string, { views: number; durations: number[] }>()
      for (const r of viewRows) {
        const screen = (r.screen || r.path || 'unknown').toString()
        const entry = screenAgg.get(screen) || { views: 0, durations: [], bounces: 0 }
        entry.views += 1
        if (r.duration_ms) entry.durations.push(Number(r.duration_ms))
        if (r.duration_ms && Number(r.duration_ms) < 10000) entry.bounces += 1
        screenAgg.set(screen, entry)
        if (r.event_id) {
          eventViewTotal += 1
          const e = eventAgg.get(r.event_id) || { views: 0, durations: [] }
          e.views += 1
          if (r.duration_ms) e.durations.push(Number(r.duration_ms))
          eventAgg.set(r.event_id, e)
        }
      }
      const screenStats: ScreenStat[] = Array.from(screenAgg.entries()).map(([screen, v]) => ({
        screen,
        views: v.views,
        avgMs: avg(v.durations),
        bounceRate: v.views ? Math.round((v.bounces / v.views) * 100) : 0
      })).sort((a, b) => b.views - a.views).slice(0, 12)
      setScreenTop(screenStats)

      const clickAgg = new Map<string, number>()
      for (const r of clickRows) {
        if (r.event_id) clickAgg.set(r.event_id, (clickAgg.get(r.event_id) || 0) + 1)
      }
      const eventIds = Array.from(eventAgg.keys())
      const names = new Map<string, string>()
      if (eventIds.length) {
        const { data } = await client.from('events_public').select('id,name').in('id', eventIds)
        for (const row of (data || [])) names.set(row.id, row.name)
      }
      const eventStats: EventStat[] = Array.from(eventAgg.entries()).map(([id, v]) => {
        const clicks = clickAgg.get(id) || 0
        const ctr = v.views ? Math.round((clicks / v.views) * 100) : 0
        return { id, name: names.get(id) || id, views: v.views, avgMs: avg(v.durations), clicks, ctr }
      }).sort((a, b) => b.views - a.views).slice(0, 10)
      setEventTop(eventStats)

      const deviceTypeAgg = new Map<string, number>()
      const osAgg = new Map<string, number>()
      const langAgg = new Map<string, number>()
      for (const r of sessionRows) {
        const dt = (r.device_type || 'unknown').toString()
        deviceTypeAgg.set(dt, (deviceTypeAgg.get(dt) || 0) + 1)
        const os = (r.os || 'unknown').toString()
        osAgg.set(os, (osAgg.get(os) || 0) + 1)
        const lang = (r.lang || '').toString().split('-')[0] || 'unknown'
        langAgg.set(lang, (langAgg.get(lang) || 0) + 1)
      }
      const toBuckets = (m: Map<string, number>) => Array.from(m.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8)
      setDeviceTypes(toBuckets(deviceTypeAgg))
      setOsStats(toBuckets(osAgg))
      setLangStats(toBuckets(langAgg))

      const regs = registrationsRes.count || 0
      const regRate = sessionRows.length ? Math.round((regs / sessionRows.length) * 100) : 0
      const clickRate = eventViewTotal ? Math.round((clickRows.length / eventViewTotal) * 100) : 0
      setConversion({ registrations: regs, regRate, clickRate })

      if (lastActiveRes.data) {
        const la = lastActiveRes.data as any
        let label = la.device_id ? `device:${la.device_id}` : 'unknown'
        if (la.user_id) {
          const { data } = await client.from('users').select('email,display_name').eq('id', la.user_id).maybeSingle()
          label = data?.display_name || data?.email || la.user_id
        }
        setLastActive({ label, ts: la.last_seen_at, path: la.current_path || '' })
      } else {
        setLastActive(null)
      }

      const realtimeRows = (realtimeRes.data || []) as any[]
      const realtimeUsers = new Set<string>()
      const screenNow = new Map<string, number>()
      const eventNow = new Map<string, number>()
      for (const r of realtimeRows) {
        realtimeUsers.add(keyFor(r.user_id, r.device_id))
        const scr = (r.current_path || 'unknown').toString()
        screenNow.set(scr, (screenNow.get(scr) || 0) + 1)
        if (r.current_event_id) eventNow.set(r.current_event_id, (eventNow.get(r.current_event_id) || 0) + 1)
      }
      const realtimeEventIds = Array.from(eventNow.keys())
      const realtimeNames = new Map<string, string>()
      if (realtimeEventIds.length) {
        const { data } = await client.from('events_public').select('id,name').in('id', realtimeEventIds)
        for (const row of (data || [])) realtimeNames.set(row.id, row.name)
      }
      setRealtime({
        activeUsers: realtimeUsers.size,
        activeSessions: realtimeRows.length,
        screens: Array.from(screenNow.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
        events: Array.from(eventNow.entries()).map(([id, count]) => ({ label: realtimeNames.get(id) || id, count })).sort((a, b) => b.count - a.count).slice(0, 6)
      })

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
      const favNames = new Map<string,string>()
      const byType: Record<string,string[]> = { event: [], club: [], dj: [] }
      for (const i of list){ byType[i.type]?.push(i.id) }
      if (byType.event.length){
        const { data } = await client.from('events_public').select('id,name').in('id', byType.event)
        for (const r of (data||[])) favNames.set(r.id, r.name)
      }
      if (byType.club.length){
        const { data } = await client.from('clubs').select('id,name').in('id', byType.club)
        for (const r of (data||[])) favNames.set(r.id, r.name)
      }
      if (byType.dj.length){
        const { data } = await client.from('djs').select('id,name').in('id', byType.dj)
        for (const r of (data||[])) favNames.set(r.id, r.name)
      }
      const withNames = list.map(i => ({ id: i.id, name: favNames.get(i.id) || i.id, count: i.count, type: i.type }))
      setFavTop(withNames)
      setFavEvents(withNames.filter(x=>x.type==='event'))
      setFavClubs(withNames.filter(x=>x.type==='club'))
      setFavDjs(withNames.filter(x=>x.type==='dj'))

      // Clicks top por evento (reusar clickRows)
      const cAgg = new Map<string,number>()
      for (const r of clickRows as any[]){ if (r.event_id){ cAgg.set(r.event_id, (cAgg.get(r.event_id)||0)+1) } }
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
    } catch(e:any){
      setErr(e?.message || 'Error cargando estadisticas')
      setFavTop([]); setFavEvents([]); setFavClubs([]); setFavDjs([])
      setClickTop([]); setSearchTop([]); setZoneTop([]); setDjsSearched([])
      setActiveUsers(0); setLatestUsers([])
      setTotals({ users: 0, anonDevices: 0, sessions: 0, views: 0 })
      setLastUser(null); setLastActive(null); setActivityRanges([])
      setScreenTop([]); setEventTop([]); setDeviceTypes([]); setOsStats([]); setLangStats([])
      setRealtime({ activeUsers: 0, activeSessions: 0, screens: [], events: [] })
      setConversion({ registrations: 0, regRate: 0, clickRate: 0 })
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
            <div className="font-medium mb-2">Resumen</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>Usuarios registrados: <span className="text-white/80">{totals.users}</span></div>
              <div>Usuarios anonimos: <span className="text-white/80">{totals.anonDevices}</span></div>
              <div>Sesiones (rango): <span className="text-white/80">{totals.sessions}</span></div>
              <div>Vistas (rango): <span className="text-white/80">{totals.views}</span></div>
              <div>Usuarios activos: <span className="text-white/80">{activeUsers}</span></div>
              <div>Duracion media: <span className="text-white/80">{formatMs(avgSessionMsRange)}</span></div>
            </div>
          </div>

          <div className="card p-4">
            <div className="font-medium mb-2">Conversion</div>
            <div className="text-sm space-y-1">
              <div>Registros (rango): <span className="text-white/80">{conversion.registrations}</span></div>
              <div>Tasa registro: <span className="text-white/80">{conversion.regRate}%</span></div>
              <div>CTR tickets: <span className="text-white/80">{conversion.clickRate}%</span></div>
            </div>
          </div>

          <div className="card p-4">
            <div className="font-medium mb-2">Ultimo usuario registrado</div>
            {lastUser ? (
              <div className="text-sm">
                <div className="truncate">{lastUser.display_name || lastUser.email || lastUser.id}</div>
                <div className="text-white/60">{lastUser.created_at ? new Date(lastUser.created_at).toLocaleString('es-ES') : ''}</div>
              </div>
            ) : (
              <div className="text-sm text-white/60">Sin datos</div>
            )}
          </div>

          <div className="card p-4">
            <div className="font-medium mb-2">Ultimo usuario activo</div>
            {lastActive ? (
              <div className="text-sm space-y-1">
                <div className="truncate">{lastActive.label}</div>
                <div className="text-white/60">{lastActive.ts ? new Date(lastActive.ts).toLocaleString('es-ES') : ''}</div>
                {lastActive.path && <div className="text-white/60 truncate">{lastActive.path}</div>}
              </div>
            ) : (
              <div className="text-sm text-white/60">Sin datos</div>
            )}
          </div>

          <div className="card p-4 md:col-span-2">
            <div className="font-medium mb-2">Actividad por rango</div>
            <div className="grid gap-2 text-sm">
              {activityRanges.map(r => (
                <div key={r.label} className="flex flex-wrap justify-between gap-2">
                  <span className="text-white/70">{r.label}</span>
                  <span>Activos: {r.activeUsers}</span>
                  <span>Media diaria: {r.avgDaily}</span>
                  <span>Sesiones: {r.sessions}</span>
                  <span>Media sesion: {formatMs(r.avgSessionMs)}</span>
                  <span>Nuevos: {r.newDevices}</span>
                  <span>Recurrentes: {r.returningDevices}</span>
                </div>
              ))}
              {activityRanges.length===0 && <div className="text-white/60">Sin datos</div>}
            </div>
          </div>

          <div className="card p-4">
            <div className="font-medium mb-2">Tiempo real</div>
            <div className="text-sm space-y-1">
              <div>Usuarios activos ahora: <span className="text-white/80">{realtime.activeUsers}</span></div>
              <div>Sesiones activas: <span className="text-white/80">{realtime.activeSessions}</span></div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-white/60">Pantallas</div>
              <ul className="space-y-1">
                {realtime.screens.map(s => (
                  <li key={s.label} className="flex justify-between"><span className="truncate">{s.label}</span><span className="text-white/60">{s.count}</span></li>
                ))}
                {realtime.screens.length===0 && <li className="text-white/60">Sin datos</li>}
              </ul>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-white/60">Eventos</div>
              <ul className="space-y-1">
                {realtime.events.map(e => (
                  <li key={e.label} className="flex justify-between"><span className="truncate">{e.label}</span><span className="text-white/60">{e.count}</span></li>
                ))}
                {realtime.events.length===0 && <li className="text-white/60">Sin datos</li>}
              </ul>
            </div>
          </div>

          <div className="card p-4">
            <div className="font-medium mb-2">Dispositivos / OS / Idioma</div>
            <div className="grid gap-3 text-sm">
              <div>
                <div className="text-white/60 mb-1">Dispositivos</div>
                <ul className="space-y-1">
                  {deviceTypes.map(d => (
                    <li key={d.label} className="flex justify-between"><span>{d.label}</span><span className="text-white/60">{d.count}</span></li>
                  ))}
                  {deviceTypes.length===0 && <li className="text-white/60">Sin datos</li>}
                </ul>
              </div>
              <div>
                <div className="text-white/60 mb-1">Sistema operativo</div>
                <ul className="space-y-1">
                  {osStats.map(o => (
                    <li key={o.label} className="flex justify-between"><span>{o.label}</span><span className="text-white/60">{o.count}</span></li>
                  ))}
                  {osStats.length===0 && <li className="text-white/60">Sin datos</li>}
                </ul>
              </div>
              <div>
                <div className="text-white/60 mb-1">Idioma</div>
                <ul className="space-y-1">
                  {langStats.map(l => (
                    <li key={l.label} className="flex justify-between"><span>{l.label}</span><span className="text-white/60">{l.count}</span></li>
                  ))}
                  {langStats.length===0 && <li className="text-white/60">Sin datos</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="card p-4 md:col-span-2">
            <div className="font-medium mb-2">Pantallas mas visitadas</div>
            <ul className="space-y-1 text-sm">
              {screenTop.map((s, idx) => (
                <li key={s.screen} className="flex flex-wrap justify-between gap-2">
                  <span className="truncate">{idx+1}. {s.screen}</span>
                  <span className="text-white/60">{s.views} vistas</span>
                  <span className="text-white/60">avg {formatMs(s.avgMs)}</span>
                  <span className="text-white/60">rebote {s.bounceRate}%</span>
                </li>
              ))}
              {screenTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
          </div>

          <div className="card p-4 md:col-span-2">
            <div className="font-medium mb-2">Eventos mas vistos</div>
            <ul className="space-y-1 text-sm">
              {eventTop.map((e, idx) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2">
                  <span className="truncate">{idx+1}. {e.name}</span>
                  <span className="text-white/60">{e.views} vistas</span>
                  <span className="text-white/60">avg {formatMs(e.avgMs)}</span>
                  <span className="text-white/60">{e.clicks} clicks</span>
                  <span className="text-white/60">CTR {e.ctr}%</span>
                </li>
              ))}
              {eventTop.length===0 && <li className="text-white/60">Sin datos</li>}
            </ul>
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
