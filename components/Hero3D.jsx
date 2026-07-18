'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei'

// Premium 3D Hero mascot (Rodin-generated, web-optimised .glb). Auto-rotates,
// drag-to-spin, studio lighting + a soft contact shadow. Lazy-loaded on the
// client only (no SSR — Three.js needs a real canvas), with a 2D image shown
// until it's ready so the page never blocks.
//
//   <Hero3D />

const MODEL = '/assets/3d/hero.glb'
useGLTF.preload(MODEL)

function Model({ autoRotate = true }) {
  const ref = useRef()
  const { scene } = useGLTF(MODEL)
  // Gentle idle spin.
  useFrame((_, delta) => {
    if (autoRotate && ref.current) ref.current.rotation.y += delta * 0.4
  })
  return (
    <Center>
      <primitive ref={ref} object={scene} />
    </Center>
  )
}

// The actual 3D scene — only mounted after we know we're on the client.
function Scene({ autoRotate, allowDrag, height }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.2, 4.4], fov: 33 }}
      style={{ height, width: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#C49A1A" />
      <Suspense fallback={null}>
        <Model autoRotate={autoRotate} />
        <Environment preset="city" />
        <ContactShadows position={[0, -1.1, 0]} opacity={0.35} scale={6} blur={2.4} far={2} />
      </Suspense>
      {allowDrag && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 2.6}
          autoRotate={false}
        />
      )}
    </Canvas>
  )
}

export default function Hero3D({
  height = 420,
  autoRotate = true,
  allowDrag = true,
  fallbackSrc = '/assets/robot/hero-robot.png',
  className = '',
  style,
}) {
  // Only render the WebGL canvas after mount (no SSR) — show the 2D image first
  // so the hero paints instantly and the 3D fades in when ready.
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height, ...style }}>
      {/* 2D fallback — always painted underneath; hidden once 3D is up. */}
      <img
        src={fallbackSrc}
        alt="Hero, the MyMathsHero AI maths tutor"
        style={{
          position: 'absolute', inset: 0, margin: 'auto', height: '100%', width: 'auto',
          objectFit: 'contain', opacity: ready ? 0 : 1, transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      />
      {ready && (
        <Suspense fallback={null}>
          <Scene autoRotate={autoRotate} allowDrag={allowDrag} height={height} />
        </Suspense>
      )}
    </div>
  )
}
