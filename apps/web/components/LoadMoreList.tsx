"use client"
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { EventCard } from './EventCard'
import { ClubCard } from './ClubCard'
import { ClubRow } from './ClubRow'
import { DjCard2 } from './DjCard2'
import type { ClubItem, DjItem, EventItem } from '@/lib/list-items'

// Cola de un listado largo (discover/djs/clubs), cargada a demanda.
//
// El servidor solo pinta la primera tanda (PAGE_SIZE, en lib/list-items.ts):
// /discover llegaba a renderizar los 439 eventos de golpe en el HTML inicial,
// 2,47 MB por visita y multiplicado por tres idiomas, para un listado del que
// casi nadie baja mas de una pantalla o dos. Lo que sigue lo trae este
// componente contra /api/list, que lee de la misma cache que la pagina.
//
// La tarjeta se elige por "kind" con un switch fijo, no con una funcion que
// recibe el componente por prop: eso ultimo se probo primero y rompe el build
// de produccion ("Functions cannot be passed directly to Client Components"),
// porque este componente es cliente y sus paginas (discover/djs/clubs) son
// servidor. 'clubs' es la tarjeta con boton de direcciones que usa discover;
// 'clubs-row' es la fila mas compacta, sin ese boton, que usa /clubs.
type Kind = 'events' | 'clubs' | 'clubs-row' | 'djs'

type ItemOf<K extends Kind> =
  K extends 'events' ? EventItem :
  K extends 'djs' ? DjItem :
  ClubItem

export function LoadMoreList<K extends Kind>({
  kind,
  initialItems,
  initialDone,
  params,
  emptyLabel,
  gridClassName = 'grid gap-3',
}: {
  kind: K
  initialItems: ItemOf<K>[]
  initialDone: boolean
  // Filtros activos (q, zone, genre, date): tienen que coincidir con los que
  // uso la pagina para pedir la primera tanda, o la segunda tanda desencajaria
  // del listado que ya se ve.
  params: Record<string, string | undefined>
  emptyLabel?: string
  // Cada listado traia su propia rejilla (dos columnas en /djs, una y mas
  // apretada en /clubs): se mantiene igual en vez de forzar un unico layout.
  gridClassName?: string
}) {
  const { t, locale } = useI18n()
  const [items, setItems] = useState<ItemOf<K>[]>(initialItems)
  const [done, setDone] = useState(initialDone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // /api/list conoce "events" | "clubs" | "djs"; clubs-row pide el mismo
  // catalogo que clubs, solo cambia como se pinta aqui.
  const apiKind = kind === 'clubs-row' ? 'clubs' : kind

  async function loadMore() {
    setLoading(true)
    setError(false)
    try {
      const qs = new URLSearchParams({ tab: apiKind, locale, offset: String(items.length) })
      for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
      const res = await fetch(`/api/list?${qs.toString()}`)
      if (!res.ok) throw new Error(String(res.status))
      const json = await res.json() as { items: ItemOf<K>[]; done: boolean }
      setItems((prev) => [...prev, ...json.items])
      setDone(json.done)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className={gridClassName}>
        {items.map((item: any) => {
          if (kind === 'events') return <EventCard key={item.id} event={item} />
          if (kind === 'djs') return <DjCard2 key={item.id} dj={item} />
          if (kind === 'clubs-row') return <ClubRow key={item.id} club={item} />
          return <ClubCard key={item.id} club={item} />
        })}
        {items.length === 0 && emptyLabel && <div className="muted">{emptyLabel}</div>}
      </div>
      {!done && items.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="text-sm px-5 py-2 rounded-full border border-[#d8af3a]/40 text-[#d8af3a] hover:bg-[#d8af3a]/10 transition-colors disabled:opacity-50"
          >
            {loading ? t('action.loading') : t('action.load_more')}
          </button>
          {error && <p className="text-xs text-red-400/80">{t('action.load_more_error')}</p>}
        </div>
      )}
    </div>
  )
}
