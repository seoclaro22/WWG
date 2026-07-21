"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import {
  animate,
  AnimationPlaybackControls,
  motion,
  useMotionValue,
  useTransform,
  ValueAnimationTransition,
} from "framer-motion"

import { cn } from "@/lib/utils"

interface NumberTickerProps {
  from?: number
  target: number
  transition?: ValueAnimationTransition
  className?: string
  autoStart?: boolean
}

export interface NumberTickerRef {
  startAnimation: () => void
}

// Version del componente de 21st.dev adaptada al proyecto: importa de
// 'framer-motion' (el paquete que ya usa la web) en vez de 'motion/react', y
// respeta prefers-reduced-motion saltando directamente al valor final.
export const NumberTicker = forwardRef<NumberTickerRef, NumberTickerProps>(
  (
    {
      from = 0,
      target,
      transition = { duration: 1.6, type: "tween", ease: "easeOut" },
      className,
      autoStart = true,
    },
    ref,
  ) => {
    // Se inicializa en el valor final, no en `from`: asi el HTML servido ya
    // contiene la cifra real (la animacion la baja y la sube al montar) y no
    // un cero que es lo que veria un rastreador que no ejecuta JS.
    const count = useMotionValue(target)
    const rounded = useTransform(count, (latest) => Math.round(latest))
    const controlsRef = useRef<AnimationPlaybackControls | null>(null)

    const startAnimation = useCallback(() => {
      controlsRef.current?.stop()
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (reduced) {
        count.set(target)
        return
      }
      count.set(from)
      controlsRef.current = animate(count, target, transition)
    }, [count, from, target])

    useImperativeHandle(ref, () => ({ startAnimation }))

    useEffect(() => {
      if (autoStart) startAnimation()
      return () => controlsRef.current?.stop()
    }, [autoStart, startAnimation])

    return <motion.span className={cn(className)}>{rounded}</motion.span>
  },
)

NumberTicker.displayName = "NumberTicker"
