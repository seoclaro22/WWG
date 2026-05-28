import { submitSubmission } from './actions'
import { T } from '@/components/T'
import { InputField, TextAreaField } from '@/components/forms/LocalizedField'

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
    <circle cx="8" cy="8" r="8" fill="rgba(216,175,58,0.15)"/>
    <path d="M5 8l2 2 4-4" stroke="#d8af3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
    <circle cx="8" cy="8" r="8" fill="rgba(216,175,58,0.25)"/>
    <path d="M8 3l1.2 3.6H13l-3 2.2 1.1 3.5L8 10.1l-3.1 2.2 1.1-3.5-3-2.2h3.8L8 3z" fill="#d8af3a"/>
  </svg>
)

export default function PromotePage({ searchParams }: { searchParams?: { ok?: string } }) {
  const ok = searchParams?.ok === '1'

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] bg-[#07060a] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-aurora opacity-40" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 px-4 md:px-6 lg:px-10 py-10 space-y-10 max-w-lg mx-auto">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d8af3a]/10 border border-[#d8af3a]/25 text-[#d8af3a] text-xs font-semibold uppercase tracking-widest">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.5 4.5H12l-3.75 2.7 1.4 4.3L6 8.9l-3.65 2.6 1.4-4.3L0 4.5h4.5L6 0z"/></svg>
            Where We Go
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            <T k="promote.hero_title" /><br />
            <span className="text-[#d8af3a]"><T k="promote.hero_title_highlight" /></span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            <T k="promote.hero_subtitle" />
          </p>
          <a
            href="#formulario"
            className="inline-block px-8 py-3.5 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_24px_rgba(216,175,58,0.4)] hover:bg-[#e8c85a] hover:shadow-[0_0_32px_rgba(216,175,58,0.55)] transition-all"
          >
            <T k="promote.cta_free" />
          </a>
        </div>

        {/* ── Puntos de dolor ──────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold text-white/50 uppercase tracking-widest">
            <T k="promote.pain_title" />
          </p>
          <div className="space-y-2">
            {(['promote.pain_1','promote.pain_2','promote.pain_3','promote.pain_4'] as const).map(k => (
              <div key={k} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/3 border border-white/6">
                <span className="shrink-0 mt-0.5 text-white/25 text-base leading-none">—</span>
                <p className="text-sm text-white/55 leading-snug"><T k={k} /></p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-[#d8af3a]/8 border border-[#d8af3a]/25">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="8" fill="rgba(216,175,58,0.2)"/>
              <path d="M9 3L5 9h4l-2 4 6-6H9l2-4z" fill="#d8af3a"/>
            </svg>
            <p className="text-sm text-[#d8af3a]/90 leading-snug font-medium"><T k="promote.pain_solution" /></p>
          </div>
        </div>

        {/* ── Beneficios gratuitos ──────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/8" />
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold px-2">Listing</p>
            <div className="h-px flex-1 bg-white/8" />
          </div>
          <div className="bg-white/4 border border-white/8 rounded-3xl p-5 space-y-3">
            <p className="text-sm font-semibold text-white"><T k="promote.free_title" /></p>
            {(['promote.free_1','promote.free_2','promote.free_3','promote.free_4','promote.free_5','promote.free_6'] as const).map(k => (
              <div key={k} className="flex items-start gap-2.5 text-sm text-white/70">
                <CheckIcon />
                <T k={k} />
              </div>
            ))}
            <div className="flex items-start gap-2.5 text-sm text-[#d8af3a]/90 font-medium border-t border-white/8 pt-3">
              <CheckIcon />
              <T k="promote.free_ref_note" />
            </div>
          </div>
        </div>

        {/* ── Beneficios premium ───────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-[#d8af3a]/20" />
            <p className="text-xs text-[#d8af3a]/70 uppercase tracking-widest font-semibold px-2"><T k="promote.sponsored" /></p>
            <div className="h-px flex-1 bg-[#d8af3a]/20" />
          </div>
          <div className="relative bg-gradient-to-br from-[#3d2a00]/60 via-[#1a1200]/60 to-[#07060a] border border-[#d8af3a]/30 rounded-3xl p-5 space-y-3 shadow-[0_0_40px_rgba(216,175,58,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white"><T k="promote.premium_title" /></p>
                <p className="text-xs text-white/50 mt-0.5"><T k="promote.premium_price" /></p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#d8af3a] text-black text-xs font-bold">PREMIUM</span>
            </div>
            {(['promote.premium_1','promote.premium_2','promote.premium_3','promote.premium_4','promote.premium_5'] as const).map(k => (
              <div key={k} className="flex items-start gap-2.5 text-sm text-white/80">
                <StarIcon />
                <T k={k} />
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA secundario ───────────────────────────────────── */}
        <div className="text-center">
          <a
            href="#formulario"
            className="inline-block px-8 py-3.5 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_24px_rgba(216,175,58,0.4)] hover:bg-[#e8c85a] transition-all"
          >
            <T k="promote.cta_start" />
          </a>
          <p className="text-xs text-white/30 mt-2"><T k="promote.cta_disclaimer" /></p>
        </div>

        {/* ── Formulario ───────────────────────────────────────── */}
        <div id="formulario" className="space-y-4 scroll-mt-8">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/8" />
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold px-2"><T k="promote.title" /></p>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {ok && (
            <div className="flex gap-3 bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="shrink-0 mt-0.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <p className="text-sm text-emerald-300"><T k="promote.success" /></p>
            </div>
          )}

          <form className="bg-white/4 border border-white/10 rounded-3xl p-5 space-y-4" action={submitSubmission}>
            <div className="space-y-1.5">
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold"><T k="promote.type" /></label>
              <select name="type" defaultValue="event" className="w-full h-11 bg-white/5 border border-white/15 rounded-2xl px-4 text-white text-sm focus:outline-none focus:border-[#d8af3a]/50 transition-colors wwg-select">
                <option value="event"><T k="promote.type.event" /></option>
                <option value="club"><T k="promote.type.club" /></option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/50 uppercase tracking-wider font-semibold"><T k="promote.sponsored" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2.5 text-sm text-white/70 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 cursor-pointer hover:border-[#d8af3a]/30 transition-colors">
                  <input type="radio" name="sponsored" value="no" defaultChecked className="accent-[#d8af3a]" />
                  <T k="promote.sponsored_no" />
                </label>
                <label className="flex items-center gap-2.5 text-sm text-white/70 bg-[#d8af3a]/5 border border-[#d8af3a]/20 rounded-2xl px-3 py-2.5 cursor-pointer hover:border-[#d8af3a]/50 transition-colors">
                  <input type="radio" name="sponsored" value="yes" className="accent-[#d8af3a]" />
                  <span className="text-[#d8af3a]/90"><T k="promote.sponsored_yes" /></span>
                </label>
              </div>
              <p className="text-xs text-white/40"><T k="promote.sponsored_hint" /></p>
            </div>
            <div className="border-t border-white/8" />
            <InputField name="name" labelKey="promote.name" placeholderKey="promote.name" required />
            <InputField name="address" labelKey="promote.address" placeholderKey="promote.address" />
            <TextAreaField name="description" labelKey="promote.description" placeholderKey="promote.description" rows={3} />
            <InputField name="email" type="email" labelKey="promote.email" placeholderKey="promote.email" required />
            <InputField name="phone" labelKey="promote.phone" placeholderKey="promote.phone" />
            <InputField name="ref" labelKey="promote.ref" placeholderKey="promote.ref" />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all"
            >
              <T k="promote.submit" />
            </button>
          </form>
          <p className="text-center text-xs text-white/30 pb-4"><T k="promote.disclaimer" /></p>
        </div>

      </div>
    </div>
  )
}
