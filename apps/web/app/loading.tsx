"use client"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F14]">
      <div className="text-center">
        <div className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text wwg-gold-sheen">
          WWG
        </div>
        <div className="mt-2 text-xs md:text-sm tracking-[0.35em] text-white/70 wwg-neon">
          WHERE WE GO
        </div>
      </div>
    </div>
  )
}
