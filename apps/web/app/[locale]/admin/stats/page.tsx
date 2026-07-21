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
type DailyPoint = { day: string; sessions: number; views: number; clicks: number }

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

async function resolveEventNames(client: ReturnType<typeof sb>, ids: string[]) {
  const names = new Map<string, string>()
  if (!ids.length) return names
  const { data } = await client.from('events_public').select('id,name').in('id', ids)
  for (const r of (data || []) as any[]) names.set(r.id, r.name)
  const missing = ids.filter(id => !names.has(id))
  if (missing.length) {
    try {
      const { data: arch } = await client.from('events_archive').select('id,name').in('id', missing)
      for (const r of (arch || []) as any[]) names.set(r.id, `${r.name} (finalizado)`)
    } catch {}
  }
  return names
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
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [totalClicks, setTotalClicks] = useState(0)
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
      setTotalClicks(clickRows.length)

      const activeSet = new Set<string>()
      for (const r of sessionRows) {
        activeSet.add(keyFor(r.user_id, r.device_id))
      }
      setActiveUsers(activeSet.size)

      const rangeDurations = sessionRows.map(r => Number(r.duration_ms || 0)).filter(n => n > 0)
      setAvgSessionMsRange(avg(rangeDurations))

      // Serie diaria para la grafica
      const dayMapDaily = new Map<string, DailyPoint>()
      const bump = (ts: string | null | undefined, field: 'sessions'|'views'|'clicks') => {
        if (!ts) return
        const dk = dayKey(ts)
        const p = dayMapDaily.get(dk) || { day: dk, sessions: 0, views: 0, clicks: 0 }
        p[field] += 1
        dayMapDaily.set(dk, p)
      }
      for (const r of sessionRows) bump(r.started_at || r.last_seen_at, 'sessions')
      for (const r of viewRows) bump(r.started_at, 'views')
      for (const r of clickRows) bump(r.ts, 'clicks')
      // Rellenar dias vacios dentro del rango (max 92 puntos)
      const dailyPoints: DailyPoint[] = []
      if (fromIso && toIso) {
        const start = new Date(fromIso)
        const end = new Date(toIso)
        for (let d = new Date(start); d <= end && dailyPoints.length < 92; d.setUTCDate(d.getUTCDate() + 1)) {
          const dk = d.toISOString().slice(0, 10)
          dailyPoints.push(dayMapDaily.get(dk) || { day: dk, sessions: 0, views: 0, clicks: 0 })
        }
      } else {
        dailyPoints.push(...Array.from(dayMapDaily.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-92))
      }
      setDaily(dailyPoints)

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
      const names = await resolveEventNames(client, eventIds)
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
      const realtimeNames = await resolveEventNames(client, Array.from(eventNow.keys()))
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
        const resolved = await resolveEventNames(client, byType.event)
        for (const [id, name] of Array.from(resolved.entries())) favNames.set(id, name)
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
      const evNames = await resolveEventNames(client, cTop.map(t => t[0]))
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
      setDaily([]); setTotalClicks(0)
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 hover:border-[#d8af3a]/40 hover:text-[#d8af3a] transition-all">Volver</Link>
          <h1 className="text-lg font-bold text-white">Panel de estadisticas</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={preset} onChange={e=>setPreset(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-[#d8af3a]/50">
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="90d">Ultimos 90 dias</option>
            <option value="all">Todo</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-[#d8af3a]/50" />
          <span className="text-sm text-white/40">a</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-[#d8af3a]/50" />
        </div>
      </div>

      {busy && <div className="text-white/50 text-sm animate-pulse">Cargando estadisticas...</div>}
      {err && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-2xl p-3">{err}</div>}

      {!busy && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Usuarios registrados" value={totals.users} />
            <Kpi label="Dispositivos anonimos" value={totals.anonDevices} />
            <Kpi label="Usuarios activos" value={activeUsers} accent />
            <Kpi label="Sesiones" value={totals.sessions} />
            <Kpi label="Vistas" value={totals.views} />
            <Kpi label="Duracion media" value={formatMs(avgSessionMsRange)} />
            <Kpi label="Registros (rango)" value={conversion.registrations} accent />
            <Kpi label="Clicks a entradas" value={totalClicks} sub={`CTR ${conversion.clickRate}%`} accent />
          </div>

          {/* Grafica actividad diaria */}
          <SectionCard title="Actividad diaria">
            <DailyChart data={daily} />
            <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#d8af3a]" /> Sesiones</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white/30" /> Vistas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Clicks entradas</span>
            </div>
          </SectionCard>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Tiempo real */}
            <SectionCard title={
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Tiempo real
              </span>
            }>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-2xl bg-white/5 p-3 text-center">
                  <div className="text-2xl font-bold text-[#d8af3a]">{realtime.activeUsers}</div>
                  <div className="text-xs text-white/50">Usuarios ahora</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 text-center">
                  <div className="text-2xl font-bold text-[#d8af3a]">{realtime.activeSessions}</div>
                  <div className="text-xs text-white/50">Sesiones activas</div>
                </div>
              </div>
              <MiniList title="Pantallas" items={realtime.screens} />
              <MiniList title="Eventos" items={realtime.events} />
              {lastActive && (
                <div className="mt-3 pt-3 border-t border-white/8 text-xs text-white/50">
                  Ultimo activo: <span className="text-white/80">{lastActive.label}</span>
                  {lastActive.ts && <> · {new Date(lastActive.ts).toLocaleString('es-ES')}</>}
                  {lastActive.path && <> · {lastActive.path}</>}
                </div>
              )}
            </SectionCard>

            {/* Dispositivos / OS / Idioma */}
            <SectionCard title="Dispositivos / OS / Idioma">
              <div className="grid grid-cols-3 gap-3">
                <BucketBars title="Dispositivo" items={deviceTypes} />
                <BucketBars title="Sistema" items={osStats} />
                <BucketBars title="Idioma" items={langStats} />
              </div>
            </SectionCard>
          </div>

          {/* Actividad por rango */}
          <SectionCard title="Actividad por rango">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Rango</th>
                    <th className="text-right py-2 font-medium">Activos</th>
                    <th className="text-right py-2 font-medium">Media diaria</th>
                    <th className="text-right py-2 font-medium">Sesiones</th>
                    <th className="text-right py-2 font-medium">Media sesion</th>
                    <th className="text-right py-2 font-medium">Nuevos</th>
                    <th className="text-right py-2 font-medium">Recurrentes</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRanges.map(r => (
                    <tr key={r.label} className="border-t border-white/5">
                      <td className="py-2 text-white/70">{r.label}</td>
                      <td className="py-2 text-right font-medium text-[#d8af3a]">{r.activeUsers}</td>
                      <td className="py-2 text-right">{r.avgDaily}</td>
                      <td className="py-2 text-right">{r.sessions}</td>
                      <td className="py-2 text-right">{formatMs(r.avgSessionMs)}</td>
                      <td className="py-2 text-right text-emerald-400/80">{r.newDevices}</td>
                      <td className="py-2 text-right">{r.returningDevices}</td>
                    </tr>
                  ))}
                  {activityRanges.length===0 && <tr><td colSpan={7} className="py-3 text-white/40 text-center">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Eventos mas vistos */}
            <SectionCard title="Eventos mas vistos">
              <div className="space-y-2">
                {eventTop.map((e, idx) => (
                  <div key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-white/30 text-xs shrink-0">{idx+1}</span>
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-white/50 text-xs shrink-0">{e.views} vistas</span>
                    <span className="text-white/50 text-xs shrink-0">{e.clicks} clicks</span>
                    <span className={`text-xs shrink-0 font-medium ${e.ctr >= 10 ? 'text-emerald-400' : 'text-white/50'}`}>CTR {e.ctr}%</span>
                  </div>
                ))}
                {eventTop.length===0 && <div className="text-white/40 text-sm">Sin datos</div>}
              </div>
            </SectionCard>

            {/* Pantallas mas visitadas */}
            <SectionCard title="Pantallas mas visitadas">
              <div className="space-y-2">
                {screenTop.map((s, idx) => (
                  <div key={s.screen} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-white/30 text-xs shrink-0">{idx+1}</span>
                    <span className="flex-1 truncate">{s.screen}</span>
                    <span className="text-white/50 text-xs shrink-0">{s.views} vistas</span>
                    <span className="text-white/50 text-xs shrink-0">avg {formatMs(s.avgMs)}</span>
                    <span className={`text-xs shrink-0 ${s.bounceRate > 60 ? 'text-red-400/80' : 'text-white/50'}`}>rebote {s.bounceRate}%</span>
                  </div>
                ))}
                {screenTop.length===0 && <div className="text-white/40 text-sm">Sin datos</div>}
              </div>
            </SectionCard>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <SectionCard title="Top reservas (clicks a entradas)">
              <GoldBars items={clickTop.map(i => ({ label: i.name, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Top favoritos">
              <GoldBars items={favTop.map(i => ({ label: `[${i.type}] ${i.name}`, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Favoritos - Eventos">
              <GoldBars items={favEvents.map(i => ({ label: i.name, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Favoritos - Clubs">
              <GoldBars items={favClubs.map(i => ({ label: i.name, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Favoritos - DJs">
              <GoldBars items={favDjs.map(i => ({ label: i.name, count: i.count }))} />
            </SectionCard>
            <SectionCard title="DJs mas buscados">
              <GoldBars items={djsSearched.map(i => ({ label: i.name, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Busquedas mas frecuentes">
              <GoldBars items={searchTop.map(i => ({ label: i.term, count: i.count }))} />
            </SectionCard>
            <SectionCard title="Zonas mas usadas">
              <GoldBars items={zoneTop.map(i => ({ label: i.zone, count: i.count }))} />
            </SectionCard>
          </div>

          {/* Usuarios */}
          <SectionCard title="Ultimos 20 usuarios">
            {lastUser && (
              <div className="mb-3 pb-3 border-b border-white/8 text-sm">
                <span className="text-white/50">Ultimo registro: </span>
                <span className="text-[#d8af3a] font-medium">{lastUser.display_name || lastUser.email || lastUser.id}</span>
                {lastUser.created_at && <span className="text-white/40"> · {new Date(lastUser.created_at).toLocaleString('es-ES')}</span>}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {latestUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-3 text-sm py-0.5">
                  <span className="truncate">{u.display_name || u.email || u.id}</span>
                  <span className="text-white/40 text-xs shrink-0">{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : ''}</span>
                </div>
              ))}
              {latestUsers.length===0 && <div className="text-white/40 text-sm">Sin datos</div>}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

/* ── UI helpers ─────────────────────────────────────────────── */

function Kpi({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? 'bg-[#d8af3a]/8 border-[#d8af3a]/25' : 'bg-white/4 border-white/8'}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-[#d8af3a]' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-white/50 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white/4 border border-white/8 p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">{title}</p>
      {children}
    </div>
  )
}

function GoldBars({ items }: { items: { label: string; count: number }[] }) {
  const max = items[0]?.count || 1
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <div key={`${i.label}-${idx}`} className="space-y-1">
          <div className="flex justify-between text-sm gap-3">
            <span className="truncate">{idx+1}. {i.label}</span>
            <span className="text-white/50 shrink-0">{i.count}</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#d8af3a] to-[#e8c85a] rounded-full" style={{ width: `${Math.round((i.count/max)*100)}%` }} />
          </div>
        </div>
      ))}
      {items.length===0 && <div className="text-white/40 text-sm">Sin datos</div>}
    </div>
  )
}

function MiniList({ title, items }: { title: string; items: Bucket[] }) {
  return (
    <div className="mt-2 text-sm">
      <div className="text-white/40 text-xs uppercase tracking-wider mb-1">{title}</div>
      <ul className="space-y-1">
        {items.map(s => (
          <li key={s.label} className="flex justify-between gap-3"><span className="truncate">{s.label}</span><span className="text-white/50 shrink-0">{s.count}</span></li>
        ))}
        {items.length===0 && <li className="text-white/40">Sin datos</li>}
      </ul>
    </div>
  )
}

function BucketBars({ title, items }: { title: string; items: Bucket[] }) {
  const max = items[0]?.count || 1
  return (
    <div>
      <div className="text-white/40 text-xs uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1.5">
        {items.map(i => (
          <div key={i.label}>
            <div className="flex justify-between text-xs gap-2">
              <span className="truncate">{i.label}</span>
              <span className="text-white/50 shrink-0">{i.count}</span>
            </div>
            <div className="h-1 bg-white/8 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-[#d8af3a]/70 rounded-full" style={{ width: `${Math.round((i.count/max)*100)}%` }} />
            </div>
          </div>
        ))}
        {items.length===0 && <div className="text-white/40 text-xs">Sin datos</div>}
      </div>
    </div>
  )
}

function DailyChart({ data }: { data: DailyPoint[] }) {
  if (!data.length) return <div className="text-white/40 text-sm py-8 text-center">Sin datos en el rango seleccionado</div>
  const W = 720, H = 180, PAD = 4
  const max = Math.max(1, ...data.map(d => Math.max(d.sessions, d.views)))
  const maxClicks = Math.max(1, ...data.map(d => d.clicks))
  const n = data.length
  const slot = (W - PAD * 2) / n
  const barW = Math.max(2, Math.min(14, slot * 0.36))
  const y = (v: number) => H - 18 - (v / max) * (H - 30)
  const yClicks = (v: number) => H - 18 - (v / maxClicks) * (H - 30)
  const labelEvery = Math.max(1, Math.ceil(n / 12))
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Actividad diaria">
        {/* grid */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PAD} x2={W-PAD} y1={y(max*f)} y2={y(max*f)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const cx = PAD + slot * i + slot / 2
          return (
            <g key={d.day}>
              <rect x={cx - barW} y={y(d.views)} width={barW} height={Math.max(0, H - 18 - y(d.views))} fill="rgba(255,255,255,0.25)" rx="1.5" />
              <rect x={cx} y={y(d.sessions)} width={barW} height={Math.max(0, H - 18 - y(d.sessions))} fill="#d8af3a" rx="1.5" />
              {d.clicks > 0 && <circle cx={cx} cy={yClicks(d.clicks)} r="2.5" fill="#34d399" />}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</text>
              )}
              <title>{`${d.day}: ${d.sessions} sesiones, ${d.views} vistas, ${d.clicks} clicks`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
