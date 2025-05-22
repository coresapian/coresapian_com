'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useState } from 'react'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function CoreModel() {
  const { scene } = useGLTF('/cyber_core.glb')
  const modelRef = useRef<THREE.Group>(null!)
  const [scale, setScale] = useState(1)
  
  useEffect(() => {
    // Calculate scale based on viewport size for 2K optimization
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Base scale for 2K (2560x1440) - adjust for other resolutions
      const baseScale = Math.min(width / 2560, height / 1440) * 3
      setScale(Math.max(baseScale, 1.5)) // Minimum scale of 1.5
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.2
      // Subtle floating animation
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={scale}
      position={[0, 0, 0]}
    />
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial 
        color="#ff6600" 
        emissive="#ff3300" 
        emissiveIntensity={0.3}
        wireframe
      />
    </mesh>
  )
}

export default function CyberCore() {
  return (
    <div className="fixed inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]} // Optimize for high DPI displays
      >
        <Suspense fallback={<LoadingFallback />}>
          <Environment preset="night" />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.2} />
          <pointLight position={[-10, -10, -10]} intensity={0.8} color="#ff6600" />
          <pointLight position={[0, 10, -10]} intensity={0.6} color="#0066cc" />
          <CoreModel />
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            maxDistance={15}
            minDistance={3}
            autoRotate={false}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}