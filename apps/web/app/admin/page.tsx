"use client"
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { AdminGuard } from '@/components/admin/AdminGuard'

function sb(){
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { storageKey: 'nighthub-auth', persistSession: true, autoRefreshToken: true } }
  )
}

type Review = { id: string; text: string | null; target_type: string; target_id: string; status: string | null; created_at: string }
type Submission = { id: string; type: 'club'|'event'; payload: any; contact_email: string; status: 'pending'|'approved'|'rejected'; created_at: string }

export default function AdminPage(){
  return (
    <AdminGuard>
      <AdminHome />
    </AdminGuard>
  )
}

function AdminHome(){
  const [revTab, setRevTab] = useState<'pending'|'approved'|'rejected'>('pending')
  const [reviews, setReviews] = useState<Review[]>([])
  const [revBusy, setRevBusy] = useState<string|null>(null)

  const [subTab, setSubTab] = useState<'pending'|'approved'|'rejected'>('pending')
  const [subs, setSubs] = useState<Submission[]>([])
  const [subBusy, setSubBusy] = useState<string|null>(null)

  async function loadReviews(){
    const client = sb()
    let q = client.from('reviews')
      .select('id,text,target_type,target_id,status,created_at')
      .order('created_at', { ascending: false })
    if (revTab === 'pending') {
      q = (q.or('status.eq.pending,status.is.null,status.not.in.(approved,rejected)') as any).limit(20)
    } else {
      q = (q.eq('status', revTab) as any).limit(20)
    }
    const { data, error } = await q
    if (error) { console.warn('reviews load', error); setReviews([]); return }
    setReviews(data || [])
  }
  async function loadSubs(){
    const client = sb()
    const { data, error } = await client.from('submissions')
      .select('*')
      .eq('status', subTab)
      .order('created_at', { ascending: false })
    if (error) { console.warn('subs load', error); setSubs([]); return }
    setSubs(data || [])
  }
  useEffect(()=>{ loadReviews() }, [revTab])
  useEffect(()=>{ loadSubs() }, [subTab])

  async function setReviewStatus(id: string, status: 'approved'|'rejected'){
    try{
      setRevBusy(id)
      const { error } = await sb().from('reviews').update({ status }).eq('id', id)
      if (error) throw error
      setReviews(prev => prev.filter(r => r.id !== id))
    }catch(e:any){ alert(e?.message || 'Error actualizando reseña') }
    finally{ setRevBusy(null) }
  }

  async function deleteReview(id: string){
    try{
      setRevBusy(id)
      const { error } = await sb().from('reviews').delete().eq('id', id)
      if (error) throw error
      setReviews(prev => prev.filter(r => r.id !== id))
    }catch(e:any){ alert(e?.message || 'Error eliminando reseña') }
    finally{ setRevBusy(null) }
  }

  async function setSubmissionStatus(id: string, status: 'approved'|'rejected'){
    try{
      setSubBusy(id)
      const client = sb()
      const s = subs.find(x => x.id === id)
      if (status === 'approved' && s){
        if (s.type === 'club'){
          const p = s.payload || {}
          const { error } = await client.from('clubs').insert({
            name: p.name || 'Sin nombre',
            description: p.description || null,
            address: p.address || null,
            referral_link: p.referral_link || p.ref || null,
            links: p.phone ? { phone: p.phone } : null,
            status: 'approved'
          })
          if (error) throw error
        } else if (s.type === 'event'){
          const p = s.payload || {}
          const insert:any = {
            name: p.name || 'Evento',
            club_id: p.club_id || null,
            description: p.description || null,
            start_at: p.start_at || new Date(Date.now()+24*3600*1000).toISOString(),
            end_at: p.end_at || null,
            genres: Array.isArray(p.genres) ? p.genres : [],
            url_referral: p.url_referral || p.ref || null,
            status: 'published'
          }
          const { error } = await client.from('events').insert(insert)
          if (error) throw error
        }
      }
      const { error: upErr } = await client.from('submissions').update({ status }).eq('id', id)
      if (upErr) throw upErr
      setSubs(prev => prev.filter(s => s.id !== id))
    }catch(e:any){ alert(e?.message || 'Error actualizando solicitud') }
    finally{ setSubBusy(null) }
  }

  const revTabs: Array<{k:'pending'|'approved'|'rejected'; label:string}> = [
    { k: 'pending', label: 'Pendientes' },
    { k: 'approved', label: 'Aprobadas' },
    { k: 'rejected', label: 'Rechazadas' },
  ]
  const subTabs = revTabs

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Back Office</h1>
          <p className="text-sm text-white/60">Gestion rapida de contenido y moderacion.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/clubs" className="card card-glass p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Clubs</div>
            <div className="text-xs text-white/60">Gestiona fichas</div>
          </div>
          <span className="text-white/60">→</span>
        </Link>
        <Link href="/admin/events" className="card card-glass p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Eventos</div>
            <div className="text-xs text-white/60">Calendario y reservas</div>
          </div>
          <span className="text-white/60">→</span>
        </Link>
        <Link href="/admin/djs" className="card card-glass p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">DJs</div>
            <div className="text-xs text-white/60">Perfiles y bios</div>
          </div>
          <span className="text-white/60">→</span>
        </Link>
        <Link href="/admin/stats" className="card card-glass p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Estadisticas</div>
            <div className="text-xs text-white/60">Actividad y top</div>
          </div>
          <span className="text-white/60">→</span>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Moderacion</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Reseñas</h3>
              <span className="text-xs text-white/60">Ultimas 20</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {revTabs.map(t => (
                <button key={t.k} className={`btn btn-secondary ${revTab===t.k?'bg-white/10':''}`} onClick={()=>setRevTab(t.k)}>{t.label}</button>
              ))}
            </div>
            <div className="grid gap-2">
              {reviews.map(r => (
                <div key={r.id} className="card p-3">
                  <div className="text-sm text-white/80">[{r.target_type}] {r.target_id}</div>
                  <div className="mt-1">{r.text || '-'}</div>
                  <div className="flex gap-2 mt-2">
                    {revTab==='pending' && (
                      <>
                        <button disabled={!!revBusy} className="btn btn-primary" onClick={()=>setReviewStatus(r.id,'approved')}>Aprobar</button>
                        <button disabled={!!revBusy} className="btn btn-secondary" onClick={()=>setReviewStatus(r.id,'rejected')}>Rechazar</button>
                      </>
                    )}
                    <button disabled={!!revBusy} className="btn btn-secondary" onClick={()=>deleteReview(r.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
              {reviews.length===0 && <div className="muted">No hay reseñas en esta pestaña.</div>}
            </div>
          </section>

          <section className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Altas pendientes</h3>
              <span className="text-xs text-white/60">Solicitudes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {subTabs.map(t => (
                <button key={t.k} className={`btn btn-secondary ${subTab===t.k?'bg-white/10':''}`} onClick={()=>setSubTab(t.k)}>{t.label}</button>
              ))}
            </div>
            <div className="grid gap-2">
              {subs.map(s => (
                <div key={s.id} className="card p-3">
                  <div className="text-sm text-white/80">[{s.type}] {s.contact_email}</div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap">{JSON.stringify(s.payload||{}, null, 2)}</pre>
                  {subTab==='pending' && (
                    <div className="flex gap-2 mt-2">
                      <button disabled={!!subBusy} className="btn btn-primary" onClick={()=>setSubmissionStatus(s.id,'approved')}>Aprobar</button>
                      <button disabled={!!subBusy} className="btn btn-secondary" onClick={()=>setSubmissionStatus(s.id,'rejected')}>Rechazar</button>
                    </div>
                  )}
                </div>
              ))}
              {subs.length===0 && <div className="muted">No hay solicitudes en esta pestaña.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
