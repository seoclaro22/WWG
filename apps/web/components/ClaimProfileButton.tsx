"use client"
import { forwardRef, useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() {
  return supabaseBrowser
}

type Estado = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'more_information_required'

const CLAVE_ESTADO: Record<Estado, string> = {
  pending: 'claim.status_pending',
  reviewing: 'claim.status_reviewing',
  approved: 'claim.status_approved',
  rejected: 'claim.status_rejected',
  more_information_required: 'claim.status_more_info',
}

// Boton de reclamacion para fichas sin verificar.
//
// El formulario pide lo minimo para poder comprobar la identidad a mano: quien
// eres, como contactarte y tu Instagram oficial, que es la prueba acordada. No
// se piden documentos: guardarlos obliga a custodiarlos.
export function ClaimProfileButton({
  targetType,
  targetId,
  targetName,
}: {
  targetType: 'dj' | 'club'
  targetId: string
  targetName: string
}) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [miSolicitud, setMiSolicitud] = useState<Estado | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const primerCampoRef = useRef<HTMLInputElement>(null)

  const esDj = targetType === 'dj'

  // Si ya reclamaste esta ficha, el boton deja de invitarte a hacerlo otra vez
  // y pasa a contarte en que punto esta. La base de datos rechaza el duplicado
  // igualmente, pero enterarse por un error seria una mala forma de saberlo.
  useEffect(() => {
    if (!user) { setMiSolicitud(null); return }
    let vivo = true
    sb()
      .from('profile_claims')
      .select('status')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (vivo) setMiSolicitud((data?.status as Estado) || null) })
    return () => { vivo = false }
  }, [user, targetType, targetId])

  // Escape cierra, y el foco entra en el primer campo al abrir: sin esto el
  // teclado se queda detras del modal.
  useEffect(() => {
    if (!abierto) return
    primerCampoRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto])

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setEnviando(true)
    setError(null)
    const f = new FormData(e.currentTarget)
    try {
      // La fila de users tiene que existir antes: profile_claims.user_id es
      // clave foranea contra ella, igual que en favoritos y follows.
      try { await sb().from('users').upsert({ id: user.id, email: (user.email as string) || '' }) } catch {}

      const { error: err } = await sb().from('profile_claims').insert({
        target_type: targetType,
        target_id: targetId,
        user_id: user.id,
        full_name: String(f.get('full_name') || '').trim(),
        email: String(f.get('email') || '').trim(),
        phone: String(f.get('phone') || '').trim() || null,
        instagram: String(f.get('instagram') || '').trim(),
        website: String(f.get('website') || '').trim() || null,
        relationship: String(f.get('relationship') || '').trim(),
        reason: String(f.get('reason') || '').trim() || null,
        extra_info: String(f.get('extra_info') || '').trim() || null,
        user_agent: navigator.userAgent,
      })
      if (err) {
        // 23505 es el indice unico que impide dos solicitudes vivas sobre la
        // misma ficha. No es un fallo: es que ya la habias enviado.
        if ((err as any).code === '23505') {
          setMiSolicitud('pending')
          setAbierto(false)
          return
        }
        throw err
      }
      setMiSolicitud('pending')
      setAbierto(false)
    } catch (err: any) {
      setError(err?.message || t('claim.error'))
    } finally {
      setEnviando(false)
    }
  }

  if (miSolicitud) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        {t(CLAVE_ESTADO[miSolicitud])}
      </div>
    )
  }

  return (
    <>
      {/* Discreto a proposito: el encargo pide que se vea pero que no compita
          con el contenido de la ficha. */}
      <button
        type="button"
        onClick={() => {
          setAbierto(true)
          // Paso intermedio del embudo. Va sin await y con el error tragado a
          // proposito: si la medicion falla, el formulario se abre igual.
          sb().from('claim_opens')
            .insert({ target_type: targetType, target_id: targetId, user_id: user?.id || null })
            .then(() => {}, () => {})
        }}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:text-white hover:border-[#d8af3a]/40 transition-colors text-left"
      >
        <span className="font-medium text-white/90">
          {t(esDj ? 'claim.dj_title' : 'claim.club_title')}
        </span>
        <span className="block text-xs text-white/55 mt-0.5">
          {t('claim.subtitle')}
        </span>
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false) }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-titulo"
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#101014] p-5 space-y-4"
          >
            <div>
              <h2 id="claim-titulo" className="text-lg font-bold text-white">
                {t('claim.modal_title')}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {targetName}
              </p>
            </div>

            {/* Que pasa despues, antes de pedir nada: el encargo insiste en que
                el usuario entienda el proceso antes de rellenar. */}
            <p className="text-xs text-white/55 leading-relaxed rounded-xl bg-white/5 px-3 py-2.5">
              {t('claim.how_it_works')}
            </p>

            {!user ? (
              <p className="text-sm text-white/70">
                {t('claim.need_login')}
              </p>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <Campo
                  ref={primerCampoRef}
                  name="full_name"
                  label={t('claim.full_name')}
                  required
                  autoComplete="name"
                />
                <Campo
                  name="email"
                  type="email"
                  label={t('claim.email')}
                  required
                  defaultValue={user.email || ''}
                  autoComplete="email"
                />
                <Campo name="phone" label={t('claim.phone')} autoComplete="tel" />
                <Campo
                  name="instagram"
                  label={t('claim.instagram')}
                  required
                  placeholder="@tucuenta"
                  ayuda={t('claim.instagram_help')}
                />
                <Campo name="website" label={t('claim.website')} placeholder="https://" />
                <Campo
                  name="relationship"
                  label={t(esDj ? 'claim.relationship_dj' : 'claim.relationship_club')}
                  required
                  placeholder={t(esDj ? 'claim.relationship_ph_dj' : 'claim.relationship_ph_club')}
                />
                <AreaTexto name="reason" label={t('claim.reason')} />
                <AreaTexto name="extra_info" label={t('claim.extra')} />

                {error && (
                  <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:text-white"
                  >
                    {t('claim.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 rounded-full bg-[#d8af3a] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {t(enviando ? 'claim.sending' : 'claim.send')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; ayuda?: string }

const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo({ label, ayuda, ...rest }, ref) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70">{label}</span>
      <input
        ref={ref}
        {...rest}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#d8af3a]/50 focus:outline-none"
      />
      {ayuda && <span className="block text-[11px] text-white/45 mt-1">{ayuda}</span>}
    </label>
  )
})

function AreaTexto({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70">{label}</span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#d8af3a]/50 focus:outline-none resize-y"
      />
    </label>
  )
}
