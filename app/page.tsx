'use client'

import dynamic from 'next/dynamic'
import GlassSection from '@/components/GlassSection'

const CyberCore = dynamic(() => import('@/components/CyberCore'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h1 className="text-4xl font-bold mb-2">
          co<span className="text-orange-500">RESEARCH</span>
        </h1>
        <p className="text-lg opacity-80">Loading core...</p>
      </div>
    </div>
  )
})

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Fixed 3D Background */}
      <CyberCore />
      
      {/* Floating Glass Sections */}
      <div className="relative z-10 pointer-events-none">
        {/* Hero Section - Center */}
        <GlassSection position="center" className="pointer-events-auto max-w-2xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              co<span className="text-orange-400">RESEARCH</span>
            </h1>
            <p className="text-xl text-gray-200 mb-6 leading-relaxed">
              A collective of AI researchers building systems and frameworks 
              to improve LLM/AI performance and abilities
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-3 bg-orange-500/20 border border-orange-400/40 rounded-lg hover:bg-orange-500/30 transition-all">
                Explore Research
              </button>
              <button className="px-6 py-3 bg-blue-500/20 border border-blue-400/40 rounded-lg hover:bg-blue-500/30 transition-all">
                Join Us
              </button>
            </div>
          </div>
        </GlassSection>

        {/* Research Focus - Top Left */}
        <GlassSection position="top-left" className="pointer-events-auto">
          <h3 className="text-2xl font-semibold mb-4 text-orange-400">Core Research</h3>
          <p className="text-gray-200 mb-4">
            Fundamental AI and machine learning research exploring the deep layers 
            of artificial intelligence systems.
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Neural Architecture Optimization</li>
            <li>• LLM Performance Enhancement</li>
            <li>• Emergent AI Behaviors</li>
          </ul>
        </GlassSection>

        {/* System Building - Top Right */}
        <GlassSection position="top-right" className="pointer-events-auto">
          <h3 className="text-2xl font-semibold mb-4 text-blue-400">System Building</h3>
          <p className="text-gray-200 mb-4">
            Creating robust frameworks and tools that push the boundaries 
            of AI capability and reliability.
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• AI Framework Development</li>
            <li>• Performance Optimization</li>
            <li>• Scalable Architecture</li>
          </ul>
        </GlassSection>

        {/* Philosophy - Bottom Left */}
        <GlassSection position="bottom-left" className="pointer-events-auto">
          <h3 className="text-2xl font-semibold mb-4 text-purple-400">Our Philosophy</h3>
          <p className="text-gray-200 mb-4">
            Like Earth&apos;s layers, research goes deep. From core principles 
            to surface applications that change the world.
          </p>
          <div className="text-sm text-gray-300">
            <p className="italic">
              &quot;Started as &apos;core&apos; researchers, now we&apos;re coRESEARCH - 
              collaborative innovation at every layer.&quot;
            </p>
          </div>
        </GlassSection>

        {/* Contact - Bottom Right */}
        <GlassSection position="bottom-right" className="pointer-events-auto">
          <h3 className="text-2xl font-semibold mb-4 text-green-400">Get Involved</h3>
          <p className="text-gray-200 mb-4">
            Join our collective of researchers pushing the boundaries 
            of AI capabilities.
          </p>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-green-500/20 border border-green-400/40 rounded-lg hover:bg-green-500/30 transition-all text-sm">
              Research Collaboration
            </button>
            <button className="w-full px-4 py-2 bg-gray-500/20 border border-gray-400/40 rounded-lg hover:bg-gray-500/30 transition-all text-sm">
              Contact Us
            </button>
          </div>
        </GlassSection>
      </div>
    </main>
  )
}