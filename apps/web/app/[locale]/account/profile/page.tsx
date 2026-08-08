"use client"
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth'
import { VerifiedBadge } from '@/components/VerifiedBadge'

// Cliente compartido de toda la app; ver lib/supabase-browser.ts.
function sb() { return supabaseBrowser }

type Perfil = {
  tipo: 'dj' | 'club'
  id: string
  name: string
  // Directos
  socials?: any; spotify_embed?: string | null; short_bio?: string | null
  links?: any; referral_link?: string | null; address?: string | null; open_hours?: any
  // Con revision
  bio?: string | null; description?: string | null; genres?: string[] | null; zone?: string | null
}

type Cambio = {
  id: string; field: string; old_value: any; new_value: any
  kind: 'direct' | 'review'; status: string; created_at: string
}

// Campos que el profesional cambia y se aplican al momento, y campos que
// mueven la indexacion y pasan por revision. La lista de verdad esta en la
// base de datos: esto solo decide como se dibuja cada bloque.
const DIRECTOS: Record<'dj' | 'club', { campo: string; label: string; tipo: 'texto' | 'area' | 'json' }[]> = {
  dj: [
    { campo: 'short_bio', label: 'Descripcion corta', tipo: 'area' },
    { campo: 'spotify_embed', label: 'Spotify (enlace o embed)', tipo: 'texto' },
    { campo: 'socials', label: 'Redes sociales', tipo: 'json' },
  ],
  club: [
    { campo: 'address', label: 'Direccion', tipo: 'texto' },
    { campo: 'referral_link', label: 'Enlace de entradas', tipo: 'texto' },
    { campo: 'links', label: 'Redes y web', tipo: 'json' },
    { campo: 'open_hours', label: 'Horarios', tipo: 'json' },
  ],
}

const CON_REVISION: Record<'dj' | 'club', { campo: string; label: string; tipo: 'texto' | 'area' | 'lista' }[]> = {
  dj: [
    { campo: 'name', label: 'Nombre artistico', tipo: 'texto' },
    { campo: 'bio', label: 'Biografia', tipo: 'area' },
    { campo: 'genres', label: 'Generos', tipo: 'lista' },
  ],
  club: [
    { campo: 'name', label: 'Nombre', tipo: 'texto' },
    { campo: 'description', label: 'Descripcion', tipo: 'area' },
    { campo: 'genres', label: 'Generos', tipo: 'lista' },
    { campo: 'zone', label: 'Zona', tipo: 'texto' },
  ],
}

export default function MiPerfilProfesionalPage() {
  const { user } = useAuth()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [activo, setActivo] = useState<string | null>(null)
  const [cambios, setCambios] = useState<Cambio[]>([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!user) { setCargando(false); return }
    // claimed_by es quien manda: se buscan las fichas de este usuario, no se
    // deduce del rol. Alguien puede tener rol 'dj' y gestionar dos fichas.
    const [djs, clubs] = await Promise.all([
      sb().from('djs').select('id,name,socials,spotify_embed,short_bio,bio,genres').eq('claimed_by', user.id),
      sb().from('clubs').select('id,name,links,referral_link,address,open_hours,description,genres,zone').eq('claimed_by', user.id),
    ])
    const lista: Perfil[] = [
      ...((djs.data || []) as any[]).map(d => ({ ...d, tipo: 'dj' as const })),
      ...((clubs.data || []) as any[]).map(c => ({ ...c, tipo: 'club' as const })),
    ]
    setPerfiles(lista)
    setActivo(prev => prev || lista[0]?.id || null)
    setCargando(false)
  }, [user])

  useEffect(() => { cargar() }, [cargar])

  const perfil = perfiles.find(p => p.id === activo) || null

  useEffect(() => {
    if (!perfil) { setCambios([]); return }
    sb().from('profile_changes')
      .select('id,field,old_value,new_value,kind,status,created_at')
      .eq('target_type', perfil.tipo).eq('target_id', perfil.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setCambios((data || []) as Cambio[]))
  }, [perfil, aviso])

  async function guardarDirecto(campo: string, valor: unknown) {
    if (!perfil) return
    setError(null)
    const { error: err } = await sb().rpc('update_profile_direct', {
      p_target_type: perfil.tipo, p_target_id: perfil.id, p_patch: { [campo]: valor },
    })
    if (err) { setError(err.message); return }
    setAviso('Guardado.')
    await cargar()
  }

  async function proponerCambio(campo: string, valor: unknown) {
    if (!perfil) return
    setError(null)
    const { error: err } = await sb().rpc('request_profile_change', {
      p_target_type: perfil.tipo, p_target_id: perfil.id, p_field: campo, p_new_value: valor,
    })
    if (err) { setError(err.message); return }
    setAviso('Propuesta enviada. La revisamos y te avisamos.')
  }

  if (cargando) return <p className="p-6 text-white/50">Cargando...</p>

  if (!user) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-bold text-white">Mi perfil profesional</h1>
        <p className="text-sm text-white/60">Inicia sesion para gestionar tu perfil.</p>
      </div>
    )
  }

  if (perfiles.length === 0) {
    return (
      <div className="p-6 space-y-3 max-w-lg">
        <h1 className="text-xl font-bold text-white">Mi perfil profesional</h1>
        <p className="text-sm text-white/60">
          Todavia no gestionas ningun perfil. Busca tu ficha de DJ o de club y
          pulsa "Reclamar perfil" para solicitarlo.
        </p>
        <Link href="/discover?tab=djs" className="inline-block text-sm text-[#d8af3a] hover:underline">
          Buscar mi ficha
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Mi perfil profesional</h1>
        <VerifiedBadge size="sm" />
      </div>

      {perfiles.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {perfiles.map(p => (
            <button
              key={p.id}
              onClick={() => setActivo(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                activo === p.id ? 'bg-[#d8af3a] text-black font-semibold' : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {perfil && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-white/60">{perfil.name}</p>
            <a
              href={perfil.tipo === 'dj' ? `/dj/${perfil.id}` : `/club/${perfil.id}`}
              target="_blank" rel="noreferrer"
              className="text-sm text-[#d8af3a] hover:underline"
            >
              Ver ficha publica
            </a>
          </div>

          {(aviso || error) && (
            <p className={`text-sm rounded-xl px-3 py-2 border ${
              error ? 'text-red-300 bg-red-500/10 border-red-500/20' : 'text-[#199e70] bg-[#199e70]/10 border-[#199e70]/20'
            }`}>
              {error || aviso}
            </p>
          )}

          <Bloque
            titulo="Se guarda al momento"
            explicacion="Estos datos son tuyos y se publican en cuanto los guardas."
          >
            {DIRECTOS[perfil.tipo].map(({ campo, label, tipo }) => (
              <CampoEditable
                key={campo}
                label={label}
                tipo={tipo}
                valor={(perfil as any)[campo]}
                onGuardar={(v) => guardarDirecto(campo, v)}
                textoBoton="Guardar"
              />
            ))}
          </Bloque>

          <Bloque
            titulo="Necesita revision"
            explicacion="Estos campos afectan a como te encuentra la gente en Google, asi que los revisamos antes de publicarlos."
          >
            {CON_REVISION[perfil.tipo].map(({ campo, label, tipo }) => (
              <CampoEditable
                key={campo}
                label={label}
                tipo={tipo}
                valor={(perfil as any)[campo]}
                onGuardar={(v) => proponerCambio(campo, v)}
                textoBoton="Proponer cambio"
                pendiente={cambios.some(c => c.field === campo && c.status === 'pending')}
              />
            ))}
          </Bloque>

          <Bloque titulo="Historial" explicacion="Todo lo que ha cambiado en tu ficha.">
            {cambios.length === 0 && <p className="text-sm text-white/45">Sin cambios todavia.</p>}
            {cambios.map(c => (
              <div key={c.id} className="text-sm border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/80 font-medium">{c.field}</span>
                  <EstadoCambio status={c.status} />
                  <span className="text-xs text-white/35">
                    {new Date(c.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            ))}
          </Bloque>
        </>
      )}
    </div>
  )
}

function Bloque({ titulo, explicacion, children }: { titulo: string; explicacion: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{titulo}</h2>
        <p className="text-xs text-white/50 mt-0.5">{explicacion}</p>
      </div>
      {children}
    </section>
  )
}

function EstadoCambio({ status }: { status: string }) {
  const mapa: Record<string, [string, string]> = {
    pending: ['Pendiente', 'border-[#fab219]/40 text-[#fab219]'],
    applied: ['Aplicado', 'border-[#199e70]/40 text-[#199e70]'],
    approved: ['Aprobado', 'border-[#199e70]/40 text-[#199e70]'],
    rejected: ['Rechazado', 'border-[#d03b3b]/40 text-[#d03b3b]'],
    reverted: ['Revertido', 'border-white/20 text-white/60'],
  }
  const [texto, clase] = mapa[status] || [status, 'border-white/20 text-white/60']
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${clase}`}>{texto}</span>
}

// Un campo con su propio boton de guardar. Un unico formulario grande obligaria
// a mandar todo junto, y aqui la mitad de los campos van por un camino y la
// otra mitad por otro.
function CampoEditable({
  label, tipo, valor, onGuardar, textoBoton, pendiente,
}: {
  label: string
  tipo: 'texto' | 'area' | 'json' | 'lista'
  valor: unknown
  onGuardar: (v: unknown) => void | Promise<void>
  textoBoton: string
  pendiente?: boolean
}) {
  const inicial = serializar(valor, tipo)
  const [texto, setTexto] = useState(inicial)
  const [problema, setProblema] = useState<string | null>(null)
  useEffect(() => { setTexto(serializar(valor, tipo)) }, [valor, tipo])

  const sucio = texto !== inicial

  function guardar() {
    try {
      setProblema(null)
      onGuardar(deserializar(texto, tipo))
    } catch (e: any) {
      setProblema(e?.message || 'Formato no valido')
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-white/70">{label}</span>
        {pendiente && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#fab219]/40 text-[#fab219]">
            Propuesta pendiente
          </span>
        )}
      </div>
      {tipo === 'texto' ? (
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#d8af3a]/50 focus:outline-none"
        />
      ) : (
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={tipo === 'json' ? 4 : 3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#d8af3a]/50 focus:outline-none resize-y font-mono"
        />
      )}
      {tipo === 'lista' && <p className="text-[11px] text-white/40">Separa con comas.</p>}
      {tipo === 'json' && <p className="text-[11px] text-white/40">Formato JSON.</p>}
      {problema && <p className="text-xs text-red-300">{problema}</p>}
      {sucio && (
        <button
          onClick={guardar}
          className="text-xs px-3 py-1.5 rounded-full bg-[#d8af3a] text-black font-semibold"
        >
          {textoBoton}
        </button>
      )}
    </div>
  )
}

function serializar(valor: unknown, tipo: string): string {
  if (valor == null) return ''
  if (tipo === 'lista') return Array.isArray(valor) ? valor.join(', ') : String(valor)
  if (tipo === 'json') return JSON.stringify(valor, null, 2)
  return String(valor)
}

function deserializar(texto: string, tipo: string): unknown {
  if (tipo === 'lista') return texto.split(',').map(s => s.trim()).filter(Boolean)
  if (tipo === 'json') {
    const t = texto.trim()
    if (!t) return null
    return JSON.parse(t)
  }
  return texto.trim() || null
}
