import React from 'react';

/**
 * GeminiVoiceOrb
 * 
 * Replaces the 3D model with an animated voice circle / orb similar to Gemini Live voice chat.
 * Reacts to states: 'IDLE', 'GREETING', 'LISTENING', 'THINKING', 'SPEAKING', 'WARNING'
 */
export default function GeminiVoiceOrb({
  state = 'IDLE',
  isSpeaking = false,
  isListening = false,
  isMuted = false
}) {
  const normState = (state || 'IDLE').toUpperCase();

  const listeningActive = isListening || normState === 'LISTENING';
  const speakingActive = isSpeaking || normState === 'SPEAKING';
  const thinkingActive = normState === 'THINKING';
  const greetingActive = normState === 'GREETING';
  const warningActive = normState === 'WARNING';
  const isActive = listeningActive || speakingActive || thinkingActive || greetingActive || warningActive;

  // Theme palettes based on active state
  let primaryGradient = 'linear-gradient(135deg, #2563EB 0%, #06B6D4 50%, #10B981 100%)';
  let glowColor = 'rgba(37, 99, 235, 0.45)';
  let ringColor1 = 'rgba(6, 182, 212, 0.28)';
  let ringColor2 = 'rgba(37, 99, 235, 0.18)';
  let statusText = 'Ready to assist';

  if (warningActive) {
    primaryGradient = 'linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #F59E0B 100%)';
    glowColor = 'rgba(220, 38, 38, 0.55)';
    ringColor1 = 'rgba(234, 88, 12, 0.35)';
    ringColor2 = 'rgba(220, 38, 38, 0.2)';
    statusText = 'Attention Required';
  } else if (listeningActive) {
    primaryGradient = 'linear-gradient(135deg, #EF4444 0%, #F97316 45%, #FBBF24 100%)';
    glowColor = 'rgba(239, 68, 68, 0.55)';
    ringColor1 = 'rgba(249, 115, 22, 0.35)';
    ringColor2 = 'rgba(239, 68, 68, 0.2)';
    statusText = 'Listening to your voice...';
  } else if (thinkingActive) {
    primaryGradient = 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #3B82F6 100%)';
    glowColor = 'rgba(139, 92, 246, 0.5)';
    ringColor1 = 'rgba(236, 72, 153, 0.3)';
    ringColor2 = 'rgba(139, 92, 246, 0.2)';
    statusText = 'Processing health records...';
  } else if (speakingActive) {
    primaryGradient = 'linear-gradient(135deg, #0B5ED7 0%, #8B5CF6 40%, #0F9D8A 100%)';
    glowColor = 'rgba(11, 94, 215, 0.55)';
    ringColor1 = 'rgba(139, 92, 246, 0.32)';
    ringColor2 = 'rgba(15, 157, 138, 0.22)';
    statusText = 'Speaking...';
  } else if (greetingActive) {
    primaryGradient = 'linear-gradient(135deg, #0F9D8A 0%, #06B6D4 50%, #0B5ED7 100%)';
    glowColor = 'rgba(15, 157, 138, 0.45)';
    ringColor1 = 'rgba(6, 182, 212, 0.3)';
    ringColor2 = 'rgba(11, 94, 215, 0.18)';
    statusText = 'Welcome!';
  }

  // Waveform bars count & heights
  const bars = [14, 28, 48, 70, 92, 60, 85, 45, 24, 16];

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[200px] sm:min-h-[300px] select-none py-2 sm:py-6">
      
      {/* Container with fixed aspect ratio */}
      <div className="relative w-44 h-44 sm:w-60 sm:h-60 flex items-center justify-center">
        
        {/* Outermost pulsing ring */}
        <div 
          className="absolute rounded-full pointer-events-none transition-all duration-700"
          style={{
            inset: isActive ? '-28px' : '-12px',
            backgroundColor: ringColor2,
            filter: 'blur(10px)',
            animation: isActive ? 'geminiPulseRing 2.4s ease-out infinite' : 'none'
          }}
        />

        {/* Secondary wave ring */}
        <div 
          className="absolute rounded-full pointer-events-none transition-all duration-700"
          style={{
            inset: isActive ? '-16px' : '-6px',
            backgroundColor: ringColor1,
            filter: 'blur(6px)',
            animation: isActive ? 'geminiPulseRing 2.4s ease-out infinite 0.6s' : 'none'
          }}
        />

        {/* Radial ambient glow */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-500 pointer-events-none"
          style={{
            boxShadow: `0 0 70px 18px ${glowColor}`,
            animation: isActive ? 'geminiGlow 2s ease-in-out infinite alternate' : 'none'
          }}
        />

        {/* Main animated orb sphere */}
        <div 
          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl flex items-center justify-center transition-transform duration-500"
          style={{
            background: primaryGradient,
            animation: speakingActive 
              ? 'geminiMorph 3s ease-in-out infinite alternate' 
              : listeningActive 
              ? 'geminiListenPulse 1.2s ease-in-out infinite' 
              : thinkingActive
              ? 'geminiSpin 6s linear infinite'
              : 'geminiBreathe 4s ease-in-out infinite'
          }}
        >
          {/* Fluid morphing specular blob overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background: 'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 45%, transparent 70%)',
              animation: 'geminiBlob 4s ease-in-out infinite alternate'
            }}
          />

          {/* Secondary counter-rotating mesh accent */}
          <div 
            className="absolute inset-2 rounded-full pointer-events-none opacity-40 mix-blend-overlay"
            style={{
              background: 'conic-gradient(from 180deg, transparent, rgba(255,255,255,0.8), transparent)',
              animation: 'geminiSpinReverse 7s linear infinite'
            }}
          />

          {/* Voice Wave Visualizer Bars inside the Orb */}
          {(speakingActive || listeningActive || thinkingActive) ? (
            <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 px-4 h-24">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="w-1 sm:w-1.5 rounded-full bg-white/95 shadow-xs"
                  style={{
                    height: `${h}%`,
                    animation: `geminiWave 0.8s ease-in-out infinite alternate`,
                    animationDelay: `${(i * 0.08).toFixed(2)}s`,
                    minHeight: '8px'
                  }}
                />
              ))}
            </div>
          ) : (
            /* Idle soft glowing nucleus core */
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div 
                className="w-12 h-12 rounded-full bg-white/40 blur-xs"
                style={{
                  animation: 'geminiCorePulse 2.6s ease-in-out infinite'
                }}
              />
            </div>
          )}

          {/* Sparkle star highlights */}
          <div 
            className="absolute top-7 left-10 w-2.5 h-2.5 bg-white rounded-full opacity-70 blur-[0.5px]"
            style={{ animation: 'geminiBlink 2.8s ease-in-out infinite' }}
          />
          <div 
            className="absolute bottom-9 right-11 w-1.5 h-1.5 bg-white rounded-full opacity-60 blur-[0.5px]"
            style={{ animation: 'geminiBlink 3.4s ease-in-out infinite 1s' }}
          />
        </div>

      </div>

      {/* Dynamic Status Text underneath the Orb */}
      <div className="mt-6 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
          <span 
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: listeningActive ? '#EF4444' : speakingActive ? '#0B5ED7' : '#10B981',
              animation: isActive ? 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
            }}
          />
          <span className="text-xs font-bold text-slate-700 tracking-wide">
            {statusText}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          {isMuted ? '🔇 Voice output muted' : '✨ Gemini Voice Assistant Mode'}
        </p>
      </div>

      {/* Embedded Keyframe Animations */}
      <style>{`
        @keyframes geminiBreathe {
          0%, 100% { transform: scale(0.97); }
          50% { transform: scale(1.03); }
        }
        @keyframes geminiListenPulse {
          0%, 100% { transform: scale(0.98); }
          50% { transform: scale(1.08); }
        }
        @keyframes geminiMorph {
          0% {
            border-radius: 50%;
            transform: scale(0.98) rotate(0deg);
          }
          33% {
            border-radius: 46% 54% 52% 48% / 51% 47% 53% 49%;
            transform: scale(1.04) rotate(4deg);
          }
          66% {
            border-radius: 53% 47% 49% 51% / 47% 53% 47% 53%;
            transform: scale(1.01) rotate(-3deg);
          }
          100% {
            border-radius: 49% 51% 54% 46% / 54% 48% 52% 46%;
            transform: scale(1.05) rotate(5deg);
          }
        }
        @keyframes geminiBlob {
          0% { transform: translate(-3%, -3%) scale(1); }
          50% { transform: translate(3%, 3%) scale(1.08); }
          100% { transform: translate(-2%, 4%) scale(0.96); }
        }
        @keyframes geminiSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes geminiSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes geminiGlow {
          0% { opacity: 0.65; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes geminiPulseRing {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes geminiWave {
          0% { transform: scaleY(0.25); opacity: 0.6; }
          100% { transform: scaleY(1.0); opacity: 1; }
        }
        @keyframes geminiCorePulse {
          0%, 100% { transform: scale(0.85); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        @keyframes geminiBlink {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
