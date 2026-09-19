import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Minus, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

/* ───────────────────────────────────────────
   Gemini-style Animated Orb
   States: idle, talking, listening, waving
   ─────────────────────────────────────────── */
const GeminiOrb = ({ state = 'idle', size = 56 }) => {
  const isListening = state === 'listening';
  const isTalking = state === 'talking';
  const isWaving = state === 'waving';
  const isActive = isTalking || isListening || isWaving;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Outer ripple rings */}
      {isActive && (
        <>
          <span
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: isListening
                ? 'rgba(239,68,68,0.18)'
                : isTalking
                ? 'rgba(11,94,215,0.18)'
                : 'rgba(15,157,138,0.18)',
              animation: 'orbRing1 1.6s ease-out infinite',
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              background: isListening
                ? 'rgba(239,68,68,0.12)'
                : isTalking
                ? 'rgba(11,94,215,0.12)'
                : 'rgba(15,157,138,0.12)',
              animation: 'orbRing2 1.6s ease-out infinite 0.3s',
            }}
          />
        </>
      )}

      {/* Core orb */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          overflow: 'hidden',
          background: isListening
            ? 'linear-gradient(135deg,#ef4444,#f97316,#eab308)'
            : isTalking
            ? 'linear-gradient(135deg,#0B5ED7,#8B5CF6,#0F9D8A)'
            : isWaving
            ? 'linear-gradient(135deg,#0F9D8A,#06B6D4,#0B5ED7)'
            : 'linear-gradient(135deg,#0B5ED7,#0F9D8A)',
          boxShadow: isActive
            ? isListening
              ? '0 0 24px 6px rgba(239,68,68,0.45)'
              : '0 0 24px 6px rgba(11,94,215,0.45)'
            : '0 4px 18px rgba(11,94,215,0.35)',
          animation: isActive ? 'orbPulse 1.4s ease-in-out infinite' : 'orbBreath 3s ease-in-out infinite',
          transition: 'background 0.4s, box-shadow 0.4s',
        }}
      >
        {/* Liquid blob overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.38) 0%, transparent 65%)',
            animation: isActive ? 'orbBlob 1.2s ease-in-out infinite alternate' : 'orbBlobSlow 4s ease-in-out infinite alternate',
          }}
        />

        {/* Sound wave bars (visible when talking or listening) */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: Math.max(2, size * 0.04),
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.85)',
                  animation: `waveBar 0.7s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.12}s`,
                  height: Math.max(6, size * 0.18),
                }}
              />
            ))}
          </div>
        )}

        {/* Idle sparkle dot */}
        {!isActive && (
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: '28%',
              width: size * 0.12,
              height: size * 0.12,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              filter: 'blur(1px)',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes orbBreath {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes orbPulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes orbBlob {
          0% { border-radius: 50%; transform: scale(1) rotate(0deg); }
          100% { border-radius: 44% 56% 58% 42% / 48% 52% 48% 52%; transform: scale(1.06) rotate(8deg); }
        }
        @keyframes orbBlobSlow {
          0% { border-radius: 50%; }
          100% { border-radius: 48% 52% 54% 46% / 50% 50% 50% 50%; }
        }
        @keyframes orbRing1 {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes orbRing2 {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes waveBar {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
};

/* ───────────────────────────────────────────
   Floating FAB button
   ─────────────────────────────────────────── */
const FloatingButton = ({ onClick, hasNewMessage }) => (
  <button
    onClick={onClick}
    className="group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
    style={{ background: 'transparent', border: 'none', padding: 0 }}
    title="Talk to Medi Card AI Nurse"
  >
    <GeminiOrb state="idle" size={64} />

    {hasNewMessage && (
      <span className="absolute -top-1 -right-1 flex h-5 w-5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-white text-[10px] font-bold">!</span>
      </span>
    )}

    <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
      ✨ Chat with AI Nurse Assistant
    </span>
  </button>
);



/* ───────────────────────────────────────────
   Quick symptom chips
   ─────────────────────────────────────────── */
const quickSymptoms = [
  { label: '🌡️ Fever Assessment', text: 'I am having fever' },
  { label: '🥗 Can I eat this?', text: 'Can I eat banana and apple with my current health condition?' },
  { label: '🔍 Explain Diet Details', text: 'Can you explain the details and nutritional impact of this food?' },
  { label: '📋 Review Medical Reports', text: 'Please analyze all my medical reports, diagnostic scans, and lab parameters.' },
  { label: '🧬 Physical Body Type & Vitals', text: 'Analyze my recorded body constitution, BMI, and vital patterns.' },
  { label: '⚠️ Allergy Safety Check', text: 'Check if any common medications conflict with my recorded allergies.' },
  { label: '🤧 Cold & Cough', text: 'I have cold and runny nose with cough' },
  { label: '🤢 Stomach & Digestion', text: 'My stomach is feeling acidic with mild discomfort' },
];

export default function FloatingChatbot() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nurseState, setNurseState] = useState('idle');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const isPatientRoute = location.pathname.startsWith('/patient') && location.pathname !== '/patient/chatbot';
  const shouldShow = Boolean(user && user.role === 'patient' && isPatientRoute);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (shouldShow) scrollToBottom();
  }, [messages, loading, shouldShow]);

  useEffect(() => {
    if (shouldShow && isOpen && !hasGreeted) {
      setNurseState('waving');
      const greeting = `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm **Medi Card AI Nurse Assistant**.\n\nI am connected to your medical records and lab diagnostics. How can I help you today?`;
      setMessages([
        {
          id: 1,
          sender: 'bot',
          text: greeting,
        }
      ]);
      setHasGreeted(true);
      speakText(greeting);
      setTimeout(() => setNurseState('idle'), 2500);
    }
  }, [isOpen, hasGreeted, shouldShow, user]);

  useEffect(() => {
    if (shouldShow && !isOpen && !hasGreeted) {
      const timer = setTimeout(() => setHasNewMessage(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasGreeted, shouldShow]);

  if (!shouldShow) return null;

  const speakText = (text, langCode = 'en') => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/[*#_~`]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 300);

    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.pitch = 1.05;

    // Language voice match
    const allVoices = window.speechSynthesis.getVoices() || [];
    const chosenVoice = allVoices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    if (chosenVoice) u.voice = chosenVoice;

    u.onstart = () => setNurseState('talking');
    u.onend = () => setNurseState('idle');
    u.onerror = () => setNurseState('idle');
    window.speechSynthesis.speak(u);
  };

  const openChat = () => {
    navigate('/patient/chatbot');
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setNurseState('idle');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
      setNurseState('talking');
    };

    rec.onresult = (e) => {
      const val = e.results[0][0].transcript;
      if (val) {
        setInput(val);
        sendMessage(val);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setNurseState('idle');
    };

    try { rec.start(); } catch (e) {}
  };

  const sendMessage = async (messageText) => {
    const text = messageText || input;
    if (!text.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
    setLoading(true);
    setNurseState('talking');

    try {
      const savedLang = localStorage.getItem('medicard_ai_lang') || 'en';
      const response = await api.post('/api/ai/chat', { 
        message: text,
        language: savedLang 
      });

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        zone: response.data.zone || 'green',
        text: response.data.reply,
        isEscalated: response.data.escalated,
        isEmergency: response.data.emergency
      }]);

      speakText(response.data.reply, response.data.language || savedLang);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        zone: 'red',
        text: "I'm having trouble connecting right now. If this is an emergency, use the SOS button.",
        isError: true
      }]);
    } finally {
      setLoading(false);
      setNurseState('idle');
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          {hasNewMessage && (
            <div className="absolute bottom-full right-0 mb-3 animate-bounce-short">
              <div className="bg-white rounded-2xl rounded-br-sm shadow-xl border border-slate-100 p-3 max-w-[220px] relative">
                <p className="text-sm text-darknavy">👋 Hi! I'm your <strong>AI Nurse Assistant</strong>. Need guidance?</p>
                <button onClick={() => setHasNewMessage(false)} className="absolute -top-2 -left-2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300">
                  <X size={10} />
                </button>
              </div>
            </div>
          )}
          <FloatingButton onClick={openChat} hasNewMessage={hasNewMessage} />
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 ${isMinimized ? 'w-72 sm:w-80' : 'w-[calc(100vw-2rem)] max-w-[390px]'}`}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: isMinimized ? 'auto' : 'min(580px, calc(100vh - 5rem))' }}>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-teal-600 p-3.5 flex items-center gap-3 cursor-pointer select-none shadow-sm" onClick={toggleMinimize}>
              <div className="relative">
                <div className="bg-white/20 rounded-full p-0.5">
                  <GeminiOrb state={nurseState} size={40} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-extrabold text-sm flex items-center gap-1.5">
                  AI Nurse Assistant
                  <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono">
                    AI
                  </span>
                </h3>
                <p className="text-blue-100 text-[11px]">
                  {loading ? 'Analyzing records...' : isListening ? 'Listening to voice...' : '● Online — Healthcare Assistant'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-white">
                <button 
                  onClick={(e) => { e.stopPropagation(); if (!isMuted) window.speechSynthesis?.cancel(); setIsMuted(!isMuted); }} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                  title={isMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleMinimize(); }} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                  <Minus size={15} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeChat(); }} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F5F9FF]/70">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-1.5`}>
                        {msg.sender === 'bot' ? (
                          <div className="flex-shrink-0 mb-1">
                            <GeminiOrb state={nurseState === 'talking' && msg.id === messages[messages.length - 1]?.id ? 'talking' : 'idle'} size={28} />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center mb-1">
                            <User size={14} className="text-primary-700" />
                          </div>
                        )}

                        <div className="flex flex-col">
                          <div className={`px-3.5 py-2.5 rounded-2xl ${
                            msg.sender === 'user'
                              ? 'bg-primary-600 text-white rounded-br-sm shadow-sm'
                              : msg.isError || msg.isEmergency
                                ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm'
                                : 'bg-white text-darknavy border border-slate-100 shadow-sm rounded-bl-sm'
                          }`}>
                            <div className="text-xs leading-relaxed whitespace-pre-line space-y-1">
                              {msg.text.split('\n\n').map((para, pIdx) => {
                                const parts = para.split(/\*\*(.*?)\*\*/g);
                                return (
                                  <p key={pIdx}>
                                    {parts.map((part, partIdx) => 
                                      partIdx % 2 === 1 ? <strong key={partIdx} className="font-bold text-primary-800">{part}</strong> : part
                                    )}
                                  </p>
                                );
                              })}
                            </div>
                          </div>

                          {msg.isEscalated && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 shadow-sm flex items-center justify-between">
                              <span className="text-[11px] font-medium text-amber-900">Symptoms continuing</span>
                              <Link to="/patient/appointments" className="text-[11px] bg-primary-600 text-white font-bold px-2.5 py-1 rounded-lg">
                                Book Doctor
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm p-3 flex items-center gap-2 text-xs text-slate-500 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping" />
                        <span>AI Nurse is thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 border-t border-slate-100 bg-white space-y-2">
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`p-2 rounded-full transition ${
                        isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Voice Input"
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Describe symptoms or ask about reports..."}
                      className="flex-1 border border-slate-200 rounded-full px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50 text-darknavy"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center transition disabled:opacity-40"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                  <p className="text-[9px] text-slate-400 text-center">
                    ⚕️ Medi Card AI Nurse Assistant • For guidance only
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
