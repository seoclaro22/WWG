"use client"
import { Link } from '@/lib/navigation'
import { SafeImage } from '@/components/SafeImage'
import { LocalText } from '@/components/LocalText'
import { T } from '@/components/T'
import { clubPath } from '@/lib/hrefs'
import type { ClubItem } from '@/lib/list-items'

// Fila de club usada en /clubs: mas compacta que ClubCard (sin boton de
// direcciones ni insignia de verificado), con la descripcion como avance.
// Va aparte y no inline en la pagina porque LoadMoreList (cliente) tiene que
// poder importarla directamente: pasarle una funcion de render desde un
// Server Component revienta el build ("Functions cannot be passed directly
// to Client Components").
export function ClubRow({ club }: { club: ClubItem }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      {club.image ? (
        <SafeImage src={club.image} alt={club.name} width={96} height={64} sizes="96px" className="w-24 h-16 object-cover rounded-lg border border-white/10" />
      ) : (
        <div className="w-24 h-16 rounded-lg bg-white/5 border border-white/10" />
      )}
      <div className="flex-1">
        <div className="font-medium">{club.name}</div>
        <div className="text-sm text-white/70 line-clamp-2">
          <LocalText value={club.description || '-'} i18n={club.description_i18n || undefined} />
        </div>
        <div className="text-xs text-white/50 mt-1">{club.address || '—'}{club.zone ? ` · ${club.zone}` : ''}</div>
      </div>
      <Link href={clubPath(club)} className="btn btn-secondary"><T k="action.view" /></Link>
    </div>
  )
}
