import { submitSubmission } from './actions'
import { T } from '@/components/T'
import { InputField, TextAreaField } from '@/components/forms/LocalizedField'

export default function PromotePage({ searchParams }: { searchParams?: { ok?: string } }) {
  const ok = searchParams?.ok === '1'
  return (
    <div className="relative -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-8 md:py-10 min-h-[100vh] rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_20%_20%,rgba(88,57,176,0.35),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(91,12,245,0.3),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(255,76,181,0.28),transparent_28%),#070a14]">
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-70 landing-aurora" />
      <div className="absolute inset-0 pointer-events-none rounded-[28px] mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(44,191,255,0.12), rgba(7,10,20,0.1) 35%, transparent 50%)' }} />
      <div className="relative z-10 space-y-4">
        <h1 className="text-2xl font-semibold"><T k="promote.title" /></h1>
        <div className="card p-3 text-sm text-white/80">
          <T k="promote.disclaimer" />
        </div>
        {ok && <div className="card p-3 text-emerald-300"><T k="promote.success" /></div>}
        <form className="card p-4 space-y-3" action={submitSubmission}>
          <div>
            <label className="block text-sm"><T k="promote.type" /></label>
            <select name="type" defaultValue="event" className="w-full bg-transparent border border-white/10 rounded-xl p-2 wwg-select">
              <option value="event"><T k="promote.type.event" /></option>
              <option value="club"><T k="promote.type.club" /></option>
            </select>
          </div>
          <div>
            <label className="block text-sm"><T k="promote.sponsored" /></label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm text-white/80 border border-white/10 rounded-xl px-3 py-2">
                <input type="radio" name="sponsored" value="no" defaultChecked />
                <T k="promote.sponsored_no" />
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80 border border-white/10 rounded-xl px-3 py-2">
                <input type="radio" name="sponsored" value="yes" />
                <T k="promote.sponsored_yes" />
              </label>
            </div>
            <div className="mt-2 text-xs text-white/60"><T k="promote.sponsored_hint" /></div>
          </div>
          <InputField name="name" labelKey="promote.name" placeholderKey="promote.name" required />
          <InputField name="address" labelKey="promote.address" placeholderKey="promote.address" />
          <TextAreaField name="description" labelKey="promote.description" placeholderKey="promote.description" rows={3} />
          <InputField name="email" type="email" labelKey="promote.email" placeholderKey="promote.email" required />
          <InputField name="phone" labelKey="promote.phone" placeholderKey="promote.phone" />
          <InputField name="ref" labelKey="promote.ref" placeholderKey="promote.ref" />
          <button className="btn btn-primary"><T k="promote.submit" /></button>
        </form>
      </div>
    </div>
  )
}
