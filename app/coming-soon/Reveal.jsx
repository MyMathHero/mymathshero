'use client'

import { useInView } from './useScrollScene'

// A wrapper that fades + slides + un-blurs its children in when they scroll into
// view. `delay` staggers siblings; `from` picks the entry direction. The blur
// gives the reveal a soft, premium "focus-in" feel (vs a plain slide).
export default function Reveal({ children, delay = 0, from = 'up', style, className }) {
  const [ref, visible] = useInView()
  const offset = {
    up: 'translateY(30px)',
    down: 'translateY(-30px)',
    left: 'translateX(38px)',
    right: 'translateX(-38px)',
    scale: 'scale(0.94)',
  }[from] || 'translateY(30px)'

  // Deeper easing + a blur that resolves as it settles.
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : offset,
        filter: visible ? 'blur(0px)' : 'blur(8px)',
        transition:
          `opacity 0.8s ${EASE} ${delay}s,` +
          `transform 0.9s ${EASE} ${delay}s,` +
          `filter 0.9s ${EASE} ${delay}s`,
        willChange: 'opacity, transform, filter',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
