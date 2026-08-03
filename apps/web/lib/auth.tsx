"use client"
import { Session, User } from '@supabase/supabase-js'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Ctx = {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = supabaseBrowser
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      if (data.session?.user) ensureUserRow()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
      if (sess?.user) ensureUserRow()
    })
    return () => { sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function ensureUserRow() {
    const u = (await supabase.auth.getUser()).data.user
    if (!u) return
    try {
      await supabase.from('users').upsert({ id: u.id, email: u.email as string })
    } catch {
      // Ignorar si ya existe o hay RLS que lo impida (no bloquea la UI)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }
  async function signOut() {
    await supabase.auth.signOut()
    try { localStorage.removeItem('nighthub-auth') } catch {}
    setSession(null)
    setUser(null)
  }

  const value: Ctx = { user, session, signIn, signUp, signOut }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}
