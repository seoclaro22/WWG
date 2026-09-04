'use client';
import type React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GradientBackgroundProps = React.ComponentProps<'div'> & {
	// Animation customization
	gradients?: string[];
	animationDuration?: number;
	animationDelay?: number;

	// Layout customization
	enableCenterContent?: boolean;

	// Visual customization
	overlay?: boolean;
	overlayOpacity?: number;
};

const Default_Gradients = [
    "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
    "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
    "linear-gradient(135deg, #0f3460 0%, #e94560 100%)",
    "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
    "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  ]

export function GradientBackground({
	children,
	className = '',
	gradients = Default_Gradients,
	animationDuration = 8,
	animationDelay = 0.5,
	overlay = false,
	overlayOpacity = 0.3,
}: GradientBackgroundProps) {
	// Antes esto animaba la propiedad CSS `background` por JS en cada frame,
	// lo que fuerza repintar toda la capa constantemente (caro, y competia
	// por GPU con el video de fondo del hero). Ahora son capas apiladas, una
	// por gradiente, con solo su opacity animada: eso lo compone la GPU sin
	// repintar.
	const stepDuration = animationDuration / Math.max(gradients.length - 1, 1)
	return (
		<div className={cn('w-full relative min-h-screen overflow-hidden', className)}>
			{/* Animated gradient background */}
			<div className="absolute inset-0" style={{ background: gradients[0] }} />
			{gradients.slice(1).map((gradient, i) => (
				<motion.div
					key={i}
					className="absolute inset-0"
					style={{ background: gradient }}
					initial={{ opacity: 0 }}
					animate={{ opacity: [0, 1, 1, 0] }}
					transition={{
						delay: animationDelay + i * stepDuration,
						duration: stepDuration * 2,
						times: [0, 0.1, 0.9, 1],
						repeat: Number.POSITIVE_INFINITY,
						repeatDelay: stepDuration * (gradients.length - 2),
						ease: 'easeInOut',
					}}
				/>
			))}

			{/* Optional overlay */}
			{overlay && (
				<div
					className="absolute inset-0 bg-black"
					style={{ opacity: overlayOpacity }}
				/>
			)}

			{/* Content wrapper */}
			{children && (
				<div
					className={cn(
						'relative z-10 flex min-h-screen items-center justify-center',
					)}
				>
					{children}
				</div>
			)}
		</div>
	);
}
