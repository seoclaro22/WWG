import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper estandar de shadcn/ui: junta clases condicionales (clsx) y resuelve
// conflictos de Tailwind (twMerge). Se crea aqui porque el proyecto no tenia
// carpeta components/ui ni este helper; los componentes de shadcn/21st.dev
// lo dan por hecho en '@/lib/utils'.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
