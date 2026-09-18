import React from 'react';
import { Volume2, Play } from 'lucide-react';

export default function NurseSpeechBubble({
  text = '',
  state = 'idle',
  isSpeaking = false,
  onReplayVoice
}) {
  const normState = (state || 'idle').toLowerCase();

  // Dynamic bubble display text
  let displayText = text;
  if (normState === 'thinking' && !text) {
    displayText = 'Let me check your medical records and prepare helpful guidance for you...';
  } else if (!displayText) {
    displayText = 'Hello! 👋 How are you feeling today? You can describe symptoms or ask about your medical reports.';
  }

  return (
    <div className="w-full max-w-md my-2 z-10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative bg-white/95 backdrop-blur-md border-2 border-[#0B5ED7]/25 rounded-2xl p-3.5 shadow-md text-[#172B4D] text-xs sm:text-sm transition-all duration-300">
        
        {/* Header inside Bubble */}
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100 text-[10px] text-[#0B5ED7] font-mono">
          <span className="font-bold flex items-center gap-1.5">
            👩‍⚕️ Medi Card AI Nurse
          </span>
          
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <span className="flex items-center gap-1 text-teal-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                🔊 Speaking...
              </span>
            ) : onReplayVoice ? (
              <button
                type="button"
                onClick={onReplayVoice}
                className="flex items-center gap-1 bg-primary-50 hover:bg-primary-100 text-[#0B5ED7] px-2.5 py-0.5 rounded-lg border border-blue-200 transition font-sans font-bold text-[10px] shadow-2xs cursor-pointer"
                title="Click to speak this message aloud"
              >
                <Play className="w-3 h-3 fill-current" /> Speak
              </button>
            ) : null}
          </div>
        </div>
        
        {/* Message Content */}
        <p className="line-clamp-4 leading-relaxed font-medium text-slate-700">
          {displayText.length > 260 ? `${displayText.slice(0, 260)}...` : displayText}
        </p>

        {/* Bubble Arrow Indicator pointing to Nurse */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-[#0B5ED7]/25 rotate-45" />
      </div>
    </div>
  );
}
