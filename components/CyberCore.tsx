'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useEffect, useState } from 'react'
import { useGLTF, OrbitControls, Environment, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function CoreModel() {
  const { scene } = useGLTF('/cyber_core.glb')
  const modelRef = useRef<THREE.Group>(null!)
  const [scale, setScale] = useState(1)
  
  useEffect(() => {
    // Enhanced scale calculation for 2K displays and responsive design
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Optimized scaling for different resolutions
      if (width >= 2560) {
        // 2K and above
        setScale(3.5)
      } else if (width >= 1920) {
        // Full HD
        setScale(3)
      } else if (width >= 1440) {
        // Laptop
        setScale(2.5)
      } else if (width >= 1024) {
        // Tablet landscape
        setScale(2)
      } else {
        // Mobile
        setScale(1.5)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  useFrame((state, delta) => {
    if (modelRef.current) {
      // Smoother, more cinematic rotation
      modelRef.current.rotation.y += delta * 0.15
      
      // Enhanced floating animation with multiple sine waves
      const time = state.clock.elapsedTime
      modelRef.current.position.y = 
        Math.sin(time * 0.5) * 0.08 + 
        Math.sin(time * 0.3) * 0.04
      
      // Subtle breathing scale effect
      const breathScale = 1 + Math.sin(time * 0.8) * 0.02
      modelRef.current.scale.setScalar(scale * breathScale)
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

function EnhancedLighting() {
  const lightRef = useRef<THREE.PointLight>(null!)
  
  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime
      lightRef.current.intensity = 1 + Math.sin(time * 2) * 0.2
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight 
        ref={lightRef}
        position={[10, 10, 10]} 
        intensity={1.2} 
        color="#00f0ff"
        distance={50}
        decay={2}
      />
      <pointLight 
        position={[-10, -10, -10]} 
        intensity={0.8} 
        color="#ff6600"
        distance={40}
        decay={2}
      />
      <pointLight 
        position={[0, 10, -10]} 
        intensity={0.6} 
        color="#a855f7"
        distance={35}
        decay={2}
      />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  )
}

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta
      meshRef.current.rotation.x += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2, 2]} />
      <meshStandardMaterial 
        color="#00f0ff" 
        emissive="#ff3300" 
        emissiveIntensity={0.3}
        wireframe
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

export default function CyberCore() {
  return (
    <div className="fixed inset-0 w-full h-full z-10">
      <Canvas
        camera={{ 
          position: [0, 0, 10], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          precision: "highp",
          logarithmicDepthBuffer: true
        }}
        dpr={[1, 2]}
        shadows
        frameloop="always"
      >
        <Suspense fallback={<LoadingFallback />}>
          <Environment preset="night" />
          <Stars 
            radius={300} 
            depth={60} 
            count={1000} 
            factor={7} 
            saturation={0.8} 
            fade
          />
          <EnhancedLighting />
          <CoreModel />
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            maxDistance={20}
            minDistance={5}
            autoRotate={false}
            enableDamping={true}
            dampingFactor={0.03}
            rotateSpeed={0.5}
            zoomSpeed={0.5}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}