"use client"
import { createClient } from '@supabase/supabase-js'

// Cliente unico de Supabase para todo el navegador.
//
// Antes cada componente creaba el suyo propio (createClient(...) en un sb()
// que se volvia a llamar en cada render o cada clic). En una pagina como
// /discover, con un boton de favorito por cada tarjeta de evento, eso eran
// decenas de instancias de GoTrueClient vivas a la vez, cada una con su
// temporizador de refresco de token y sus listeners de storage/
// visibilitychange en window/document que nunca se liberaban. El aviso
// "Multiple GoTrueClient instances detected" en consola no era cosmetico: es
// una fuga de memoria real que crecia cuanto mas se navegaba.
//
// Exportar la instancia ya creada (no una funcion que la crea) es lo que
// garantiza un unico cliente por pestana: el modulo se evalua una vez.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: 'nighthub-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
