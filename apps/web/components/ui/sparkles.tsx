"use client"
import React, { memo, useId, useMemo } from "react"
import { useEffect, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import type { Container } from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"
import { cn } from "@/lib/utils"
import { motion, useAnimation } from "framer-motion"

type ParticlesProps = {
  id?: string
  className?: string
  background?: string
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
}

// memo, y no el componente suelto del catalogo: la portada reescribe el
// placeholder del buscador letra a letra, asi que su estado cambia cada ~50ms.
// Sin esto, cada pulsacion del tipeo re-renderiza las particulas y se ve un
// tiron en el movimiento.
const SparklesCoreBase = (props: ParticlesProps) => {
  const {
    id,
    className,
    background,
    minSize,
    maxSize,
    speed,
    particleColor,
    particleDensity,
  } = props
  const [init, setInit] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setInit(true))
  }, [])

  const controls = useAnimation()

  const particlesLoaded = async (container?: Container) => {
    if (container) {
      controls.start({ opacity: 1, transition: { duration: 1 } })
    }
  }

  const generatedId = useId()

  // Las opciones tienen que ser el mismo objeto entre renders: si se recrean,
  // tsparticles reinicia el lienzo y las particulas saltan de sitio.
  const options = useMemo(
    () =>
      ({
        background: { color: { value: background || "transparent" } },
        fullScreen: { enable: false, zIndex: 1 },
        fpsLimit: 60,
        // El componente original reacciona al click anadiendo particulas.
        // Aqui la interaccion esta desactivada por completo: la portada ya
        // tuvo un efecto de click y se retiro a proposito.
        interactivity: {
          events: {
            onClick: { enable: false },
            onHover: { enable: false },
            resize: true,
          },
        },
        particles: {
          color: { value: particleColor || "#d8af3a" },
          move: {
            direction: "none",
            enable: true,
            outModes: { default: "out" },
            random: false,
            speed: { min: 0.05, max: 0.4 },
            straight: false,
          },
          number: {
            density: { enable: true, width: 400, height: 400 },
            value: particleDensity || 60,
          },
          opacity: {
            value: { min: 0.1, max: 0.8 },
            animation: {
              enable: true,
              speed: speed || 2,
              sync: false,
              startValue: "random",
            },
          },
          shape: { type: "circle" },
          size: { value: { min: minSize || 0.4, max: maxSize || 1.2 } },
        },
        detectRetina: true,
      }) as any,
    [background, particleColor, particleDensity, speed, minSize, maxSize]
  )

  return (
    <motion.div animate={controls} className={cn("opacity-0", className)}>
      {init && (
        <Particles
          id={id || generatedId}
          className="h-full w-full"
          particlesLoaded={particlesLoaded}
          options={options}
        />
      )}
    </motion.div>
  )
}

export const SparklesCore = memo(SparklesCoreBase)
