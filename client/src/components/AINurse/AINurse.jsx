import React from 'react';
import { 
  Volume2, VolumeX, ShieldCheck, HeartPulse, 
  Play, Mic, Sparkles
} from 'lucide-react';
import GeminiVoiceOrb from './GeminiVoiceOrb';
import NurseSpeechBubble from './NurseSpeechBubble';
import NurseStatus from './NurseStatus';

export default function AINurse({
  state = 'idle',
  speechText = '',
  isSpeaking = false,
  isMuted = false,
  onToggleMute,
  onReplayVoice,
  onTriggerVoiceInput,
  isListening = false,
  language = 'en',
  patientName = 'Patient'
}) {
  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[540px] flex flex-col items-center justify-between rounded-3xl bg-gradient-to-b from-[#F0F6FF] via-[#F8FBFF] to-[#EBF4FF] p-4 border border-slate-200/80 shadow-lg overflow-hidden select-none">
      
      {/* Top Bar: Nurse Identity & Controls */}
      <div className="w-full flex items-center justify-between z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-[#0B5ED7] to-[#0F9D8A] text-white rounded-2xl shadow-sm">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#172B4D] tracking-wide">
                Medi Card AI Nurse
              </h3>
              <span className="text-[10px] bg-blue-100 text-[#0B5ED7] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-200">
                AI VOICE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F9D8A]" /> Authorized Clinical Assistant
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Voice Mic button */}
          {onTriggerVoiceInput && (
            <button
              type="button"
              onClick={onTriggerVoiceInput}
              className={`p-2 rounded-xl transition border text-xs flex items-center gap-1.5 font-bold cursor-pointer ${
                isListening
                  ? 'bg-red-100 text-red-700 border-red-300 animate-pulse shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
              title={isListening ? 'Stop Listening' : 'Speak to Nurse (Voice Input)'}
            >
              <Mic className="w-4 h-4 text-[#0B5ED7]" />
              <span className="hidden sm:inline text-[11px]">{isListening ? 'Listening...' : 'Voice Input'}</span>
            </button>
          )}

          {/* Audio Mute / Unmute Button */}
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2 rounded-xl transition border text-xs flex items-center gap-1.5 font-semibold cursor-pointer ${
                isMuted
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-white text-[#0F9D8A] border-teal-200 hover:bg-teal-50 shadow-2xs'
              }`}
              title={isMuted ? 'Unmute Nurse Voice' : 'Mute Nurse Voice'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#0F9D8A]" />}
              <span className="hidden sm:inline text-[11px]">{isMuted ? 'Muted' : 'Voice ON'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Speech Bubble */}
      <NurseSpeechBubble 
        text={speechText}
        state={state}
        isSpeaking={isSpeaking}
        onReplayVoice={onReplayVoice}
      />

      {/* Gemini Live Animated Voice Orb Circle */}
      <div className="w-full flex-1 flex items-center justify-center my-auto min-h-[200px] sm:min-h-[280px]">
        <GeminiVoiceOrb 
          state={state}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isMuted={isMuted}
        />
      </div>

      {/* Bottom Status & Patient Badge */}
      <NurseStatus 
        state={state}
        patientName={patientName}
      />

    </div>
  );
}
