import React, { Suspense, Component } from 'react';
import { Html, useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import NurseModel from './NurseModel';
import { HeartPulse, Loader2 } from 'lucide-react';

/**
 * Clean Error Boundary for WebGL/Three.js rendering
 */
class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('3D Nurse Scene error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200">
          <div className="p-3 bg-blue-50 text-[#0B5ED7] rounded-2xl mb-3 shadow-xs">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-[#172B4D]">3D Nurse Clinical Assistant</h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Interactive voice & clinical intelligence active.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Healthcare Loading Placeholder shown during 3D model streaming
 */
function ModelLoadingPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-10 rounded-2xl">
      <div className="relative flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#0B5ED7] animate-spin" />
        <HeartPulse className="w-4 h-4 text-[#0F9D8A] absolute" />
      </div>
      <p className="mt-3 text-xs font-bold text-slate-700">Loading 3D AI Nurse...</p>
      <span className="text-[10px] text-slate-400 mt-0.5">Initializing clinical model</span>
    </div>
  );
}

/** 3D Loading indicator rendered inside the Canvas using Html */
function Loader3D() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: '#0B5ED7', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
        Loading... {Math.round(progress)}%
      </div>
    </Html>
  );
}

export default function NurseScene({
  state = 'idle',
  isSpeaking = false,
  isMuted = false,
  onModelClick
}) {
  return (
    <div 
      onClick={onModelClick}
      className="relative w-full h-full min-h-[340px] sm:min-h-[440px] flex items-center justify-center rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none bg-gradient-to-b from-[#F3F8FF] via-[#FFFFFF] to-[#EDF5FF]"
      title="3D Virtual Nurse (Drag to rotate, scroll to zoom)"
    >
      <SceneErrorBoundary>
        <Suspense fallback={<ModelLoadingPlaceholder />}>
          <Canvas
            shadows
            camera={{ position: [0, 0.55, 1.8], fov: 42 }}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            {/* Bright Natural Healthcare Environment Lighting */}
            <Environment preset="city" />

            {/* Ambient Base Light */}
            <ambientLight intensity={1.2} />
            
            {/* Key Light (Clinical Daylight) */}
            <directionalLight 
              position={[3.0, 4.0, 3.5]} 
              intensity={1.8} 
              castShadow 
              shadow-mapSize-width={1024} 
              shadow-mapSize-height={1024}
              shadow-bias={-0.0001}
            />
            
            {/* Fill Light (Soft Medical Cyan) */}
            <directionalLight 
              position={[-3.5, 2.5, 2.0]} 
              intensity={0.9} 
              color="#06B6D4" 
            />
            
            {/* Rim Backlight (Medical Blue) */}
            <directionalLight 
              position={[0, 3.5, -3.5]} 
              intensity={1.0} 
              color="#0B5ED7" 
            />

            {/* Soft, Subtle Ground Contact Shadow */}
            <ContactShadows 
              position={[0, -0.9, 0]} 
              opacity={0.3} 
              scale={4} 
              blur={2.5} 
              far={3.5} 
              color="#0b5ed7" 
            />

            {/* Real GLB 3D Nurse Model — wrapped in inner Suspense for R3F v8 */}
            <Suspense fallback={<Loader3D />}>
              <NurseModel
                state={state}
                isSpeaking={isSpeaking}
                isMuted={isMuted}
              />
            </Suspense>

            {/* 360° OrbitControls */}
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              minDistance={1.2}
              maxDistance={3.5}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.6}
              target={[0, 0.45, 0]}
            />
          </Canvas>
        </Suspense>
      </SceneErrorBoundary>

      {/* Speaking Soundwave Indicator Overlay */}
      {isSpeaking && (
        <div className="absolute bottom-3.5 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-primary-200 shadow-md pointer-events-none z-10 animate-bounce-subtle">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <span
              key={i}
              className="w-1.5 bg-gradient-to-t from-teal-500 to-primary-600 rounded-full animate-pulse"
              style={{
                height: `${8 + (i % 4) * 8}px`,
                animationDuration: `${0.3 + i * 0.07}s`
              }}
            />
          ))}
          <span className="text-[11px] font-bold text-primary-800 ml-1.5">Speaking Live Audio</span>
        </div>
      )}
    </div>
  );
}
