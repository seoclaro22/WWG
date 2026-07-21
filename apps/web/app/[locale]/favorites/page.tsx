"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"
import Link from "next/link"
// Quitamos el corazón en la lista; usaremos un botón de eliminar explícito

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: "nighthub-auth", persistSession: true, autoRefreshToken: true } }
  )
}

type FavItem = {
  id: string
  name: string
  start_at?: string | null
  club_name?: string | null
  type: "event" | "club" | "dj"
}

export default function FavoritesPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const client = useMemo(() => sb(), [])
  const [items, setItems] = useState<FavItem[]>([])
  const [loading, setLoading] = useState(false)
  const run = useRef(0)
  async function removeFavorite(it: FavItem) {
    // Optimista: quitar de la UI al momento
    setItems(prev => prev.filter(p => !(p.id === it.id && p.type === it.type)))
    const { error } = await client
      .from('favorites')
      .delete()
      .eq('user_id', user!.id)
      .eq('target_type', it.type)
      .eq('target_id', it.id)
    if (error) {
      alert('No se pudo eliminar de favoritos: ' + (error.message || 'Error'))
      // Revertir en caso de error
      load()
    }
  }

  async function fromRpc(): Promise<FavItem[]> {
    const { data, error } = await client.rpc("favorites_expanded")
    if (error) throw error
    const rows = (data || []) as any[]
    return rows.map(r => ({ id: r.id, name: r.name, start_at: r.start_at, club_name: r.club_name, type: r.type }))
  }

  async function fallback(): Promise<FavItem[]> {
    // Un solo SELECT a favorites y luego 3 consultas paralelas
    const { data: favs, error } = await client
      .from('favorites')
      .select('target_type,target_id,created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    if (error || !favs?.length) return []

    const eIds = favs.filter(f=>f.target_type==='event').map(f=>f.target_id)
    const cIds = favs.filter(f=>f.target_type==='club').map(f=>f.target_id)
    const dIds = favs.filter(f=>f.target_type==='dj').map(f=>f.target_id)

    const [eRes, cRes, dRes] = await Promise.all([
      eIds.length
        ? client.from('events').select('id,name,start_at,club_id').in('id', eIds)
        : Promise.resolve({ data: [] as any[] }),
      cIds.length
        ? client.from('clubs').select('id,name').in('id', cIds)
        : Promise.resolve({ data: [] as any[] }),
      dIds.length
        ? client.from('djs').select('id,name').in('id', dIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    // Mapa para club_name de eventos
    const clubMap = new Map<string,string>()
    if (cIds.length) {
      const { data: clubsForEvents } = await client
        .from('clubs')
        .select('id,name')
        .in('id', Array.from(new Set((eRes.data||[]).map((e:any)=> e.club_id).filter(Boolean))))
      for (const c of (clubsForEvents||[])) clubMap.set(c.id, c.name)
    }

    const evts: FavItem[] = (eRes.data || []).map((x: any) => ({
      id: x.id,
      name: x.name,
      start_at: x.start_at,
      club_name: x.club_id ? (clubMap.get(x.club_id) || null) : null,
      type: 'event'
    }))
    const clubs: FavItem[] = (cRes.data || []).map((x: any) => ({ id: x.id, name: x.name, type: 'club' }))
    const djs: FavItem[] = (dRes.data || []).map((x: any) => ({ id: x.id, name: x.name, type: 'dj' }))

    // Orden final por created_at del favorito
    const orderMap = new Map<string, number>()
    favs.forEach((f, idx) => orderMap.set(`${f.target_type}:${f.target_id}`, idx))
    const all = [...evts, ...clubs, ...djs]
    all.sort((a,b) => (orderMap.get(`${a.type}:${a.id}`) ?? 0) - (orderMap.get(`${b.type}:${b.id}`) ?? 0))
    return all
  }

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return }
    const id = ++run.current
    setLoading(true)
    try {
      const list = await fromRpc().catch(fallback)
      if (id !== run.current) return
      setItems(list)
    } finally {
      if (id === run.current) setLoading(false)
    }
  }, [client, user])

  useEffect(() => { load() }, [load])

  // Responder inmediatamente a cambios de favoritos en otras vistas
  useEffect(() => {
    const onFav = () => load()
    if (typeof window !== 'undefined') {
      window.addEventListener('nighthub-fav-changed', onFav)
      return () => window.removeEventListener('nighthub-fav-changed', onFav)
    }
  }, [load])

  useEffect(() => {
    if (!user) return
    const ch = client.channel("fav-changes-db")
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => { client.removeChannel(ch) }
  }, [client, user, load])

  if (!user) return <div className="muted">{t('common.login_to_view')}</div>
  const eventItems = items.filter(i => i.type === 'event')
  const clubItems = items.filter(i => i.type === 'club')
  const djItems = items.filter(i => i.type === 'dj')
  const isLoading = loading && items.length === 0

  const renderList = (list: FavItem[]) => (
    list.map(it => (
      <div key={`${it.type}:${it.id}`} className="card p-4 flex items-center justify-between">
        <Link href={it.type === 'event' ? `/event/${it.id}` : it.type === 'club' ? `/club/${it.id}` : `/dj/${it.id}`} className="flex-1 min-w-0">
          <div className="font-medium truncate">{it.name}</div>
          {it.type === 'event' && (
            <div className="text-sm text-white/60">{it.club_name} - {it.start_at ? new Date(it.start_at).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }) : ''}</div>
          )}
        </Link>
        <div className="ml-3 shrink-0 flex items-center">
          <button
            className="btn btn-secondary text-xs px-3 py-1"
            onClick={() => removeFavorite(it)}
          >
            {t('action.remove') || 'Eliminar'}
          </button>
        </div>
      </div>
    ))
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('favorites.title')}</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis clubs favoritos</h2>
        <div className="grid gap-3">
          {isLoading && (
            <>
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            </>
          )}
          {!isLoading && clubItems.length > 0 && renderList(clubItems)}
          {!isLoading && clubItems.length === 0 && (
            <div className="muted">No tienes clubs favoritos.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis DJs favoritos</h2>
        <div className="grid gap-3">
          {isLoading && (
            <>
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            </>
          )}
          {!isLoading && djItems.length > 0 && renderList(djItems)}
          {!isLoading && djItems.length === 0 && (
            <div className="muted">No tienes DJs favoritos.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mis eventos favoritos</h2>
        <div className="grid gap-3">
          {isLoading && (
            <>
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            </>
          )}
          {!isLoading && eventItems.length > 0 && renderList(eventItems)}
          {!isLoading && eventItems.length === 0 && (
            <div className="muted">No tienes eventos favoritos.</div>
          )}
        </div>
      </section>
    </div>
  )
}
