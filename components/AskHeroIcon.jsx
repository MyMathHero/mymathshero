'use client'

export default function AskHeroIcon({ size = 40, style, alt = 'Ask Hero' }) {
  return (
    <img
      src="/assets/robot/askheroCHATBOT.png"
      alt={alt}
      style={{
        width: size,
        height: size,
        display: 'block',
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}
