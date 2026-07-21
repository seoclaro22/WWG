import { ReactNode } from 'react'

// El <html>/<body> vive en app/[locale]/layout.tsx para poder fijar el
// atributo lang segun el idioma de la URL. Este layout raiz solo delega.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
