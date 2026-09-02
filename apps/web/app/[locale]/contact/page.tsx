import { submitContact } from './actions'
import { T } from '@/components/T'
import { InputField, TextAreaField } from '@/components/forms/LocalizedField'
import { buildAlternates } from '@/lib/seo'

export function generateMetadata({ params }: { params: { locale: string } }) {
  return { alternates: buildAlternates('/contact', params.locale) }
}

export default function ContactPage({ searchParams }: { searchParams?: { ok?: string } }) {
  const ok = searchParams?.ok === '1'
  const failed = searchParams?.ok === '0'

  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 min-h-[100vh] rounded-[28px] bg-[#07060a] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-base opacity-50" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] landing-gold-vignette" />

      <div className="relative z-10 px-4 md:px-6 lg:px-10 py-10 space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-3 pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight"><T k="contact.title" /></h1>
          <p className="text-white/60 text-base leading-relaxed"><T k="contact.subtitle" /></p>
        </div>

        {failed && (
          <div className="flex gap-3 bg-red-400/10 border border-red-400/20 rounded-2xl p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="shrink-0 mt-0.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p className="text-sm text-red-300"><T k="contact.error_invalid" /></p>
          </div>
        )}
        {ok && (
          <div className="flex gap-3 bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="shrink-0 mt-0.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <p className="text-sm text-emerald-300"><T k="contact.success" /></p>
          </div>
        )}

        <form className="bg-white/4 border border-white/10 rounded-3xl p-5 space-y-4" action={submitContact}>
          {/* Honeypot: invisible para una persona, pero cualquier bot que
              rellene todos los inputs del HTML cae aqui. Ver actions.ts. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px opacity-0"
          />
          <InputField name="name" labelKey="contact.name" placeholderKey="contact.name" required />
          <InputField name="email" type="email" labelKey="contact.email" placeholderKey="contact.email" required />
          <TextAreaField name="message" labelKey="contact.message" placeholderKey="contact.message" rows={5} required />
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#d8af3a] text-black font-bold text-base shadow-[0_0_20px_rgba(216,175,58,0.35)] hover:bg-[#e8c85a] hover:shadow-[0_0_28px_rgba(216,175,58,0.5)] transition-all"
          >
            <T k="contact.submit" />
          </button>
        </form>
      </div>
    </div>
  )
}
