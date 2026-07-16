'use client'

import { useInView } from './useScrollScene'

// A wrapper that fades + slides its children in when they scroll into view.
// `delay` staggers siblings; `from` picks the entry direction.
export default function Reveal({ children, delay = 0, from = 'up', style, className }) {
  const [ref, visible] = useInView()
  const offset = {
    up: 'translateY(28px)',
    down: 'translateY(-28px)',
    left: 'translateX(36px)',
    right: 'translateX(-36px)',
    scale: 'scale(0.94)',
  }[from] || 'translateY(28px)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : offset,
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
