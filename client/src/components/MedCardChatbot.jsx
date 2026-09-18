import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Bot, Sparkles, 
  Trash2, ShieldCheck, Activity, Globe, User, RefreshCw, AlertCircle
} from 'lucide-react';
import api from '../lib/api';

const QUICK_ACTIONS = {
  en: [
    { label: '👶 Lifelong history (Baby to Date)', query: "Summarize this patient's complete lifelong medical records from infancy/baby time to present date" },
    { label: '🌡️ Fever remedies & hospital protocol', query: 'What are the recommended remedies for fever and when should the patient go to the hospital?' },
    { label: '📝 Update check-up details', query: 'What details should we record in the current checkup to update medical history?' },
    { label: '⚠️ Allergies check', query: 'What allergies does this patient have?' },
    { label: '💊 Prescribed medications', query: 'What medications and prescriptions are on file for this patient?' },
    { label: '📋 Clinical diagnoses', query: 'Summarize previous clinical diagnoses and visit history' },
    { label: '🧪 Lab & diagnostic reports', query: 'What diagnostic reports and test findings are available?' },
    { label: '🩺 Vitals & physical build', query: 'What are the recorded vitals, blood group, and BMI?' }
  ],
  ta: [
    { label: '👶 குழந்தை முதல் இன்று வரை வரலாறு', query: 'குழந்தை பருவம் முதல் இன்று வரை உள்ள முழுமையான மருத்துவ வரலாற்றை சுருக்கமாக கூறுங்கள்' },
    { label: '🌡️ காய்ச்சல் பராமரிப்பு & மருத்துவமனை எச்சரிக்கை', query: 'காய்ச்சலுக்கான பரிந்துரைக்கப்பட்ட வழிகள் மற்றும் எப்போது மருத்துவமனைக்கு செல்ல வேண்டும்?' },
    { label: '📝 பரிசோதனை விவரங்களை புதுப்பித்தல்', query: 'தற்போதைய பரிசோதனை விவரங்களை எவ்வாறு மருத்துவ வரலாற்றில் புதுப்பிப்பது?' },
    { label: '⚠️ ஒவ்வாமை விவரம்', query: 'இந்த நோயாளிக்கு என்ன allergies இருக்கிறது?' },
    { label: '💊 பரிந்துரைக்கப்பட்ட மருந்துகள்', query: 'இந்த நோயாளிக்கு பரிந்துரைக்கப்பட்ட மருந்துகள் என்ன?' },
    { label: '📋 மருத்துவ வரலாறு', query: 'முந்தைய நோய் கண்டறிதல் மற்றும் மருத்துவ வரலாற்றை சுருக்கமாக கூறுங்கள்' },
    { label: '🧪 ஆய்வக அறிக்கைகள்', query: 'நோயாளியின் ஆய்வக அறிக்கைகள் மற்றும் பரிசோதனை விவரங்கள் என்ன?' },
    { label: '🩺 இரத்த வகை & உடல்நிலை', query: 'நோயாளியின் இரத்த வகை மற்றும் உடல் பரிசோதனை விவரங்களை கூறுங்கள்' }
  ]
};

export default function MedCardChatbot({ patient, role = 'doctor', onOpenCheckup }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' | 'ta'
  const [autoVoice, setAutoVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [voiceError, setVoiceError] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const patientId = patient?.patient_id || patient?.id;
  const patientName = patient?.name || 'Patient';
  const allergies = patient?.allergies || 'None Reported';
  const healthId = patient?.healthId || patient?.health_id || 'SWID-2024-0001';

  // Load chat history from database or initialize greeting when active patient changes
  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    const initialGreeting = language === 'ta'
      ? `வணக்கம் ${patientName}! இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`
      : `Hi ${patientName}! How can I help you today?`;

    const fallbackGreeting = [
      {
        id: `init-${patientId}-${Date.now()}`,
        sender: 'ai',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    // Fetch database-persisted chat records
    api.get(`/api/ai/history/${patientId}`)
      .then(res => {
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data.history) && res.data.history.length > 0) {
          const loaded = [];
          // Include brief greeting first
          loaded.push(fallbackGreeting[0]);

          res.data.history.forEach(item => {
            const time = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (item.senderMessage) {
              loaded.push({
                id: `db-user-${item.id}`,
                sender: 'doctor',
                text: item.senderMessage,
                timestamp: time
              });
            }
            if (item.aiResponse) {
              loaded.push({
                id: `db-ai-${item.id}`,
                sender: 'ai',
                text: item.aiResponse,
                timestamp: time,
                suggestUpdate: true
              });
            }
          });
          setMessages(loaded);
        } else {
          setMessages(fallbackGreeting);
        }
      })
      .catch(err => {
        console.warn('Failed to load chat history from DB:', err.message);
        if (isMounted) setMessages(fallbackGreeting);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, language, patientName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clean text and speak via Web Speech API Text-to-Speech
  const handleSpeak = (text, msgId) => {
    if (!('speechSynthesis' in window)) {
      setVoiceError('Text-to-speech is not supported in this browser.');
      setTimeout(() => setVoiceError(''), 4000);
      return;
    }

    // Toggle off if currently speaking this message
    if (activeSpeechId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#_~`•]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    const targetVoice = voices.find(v => 
      language === 'ta' 
        ? v.lang.toLowerCase().includes('ta') 
        : v.lang.toLowerCase().includes('en')
    );
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onstart = () => setActiveSpeechId(msgId);
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Microphone Speech-to-Text
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice recognition is not supported in this browser. Use Chrome or Edge.');
      setTimeout(() => setVoiceError(''), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError('');
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0]?.transcript;
        if (transcript && transcript.trim()) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
        setIsListening(false);
        if (err.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow microphone access.');
          setTimeout(() => setVoiceError(''), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Send message to Express Backend (/api/ai/chat)
  const handleSendMessage = async (textToSend) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading || !patientId) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        sender: 'doctor',
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Call Express Backend API with selected patient context
      const { data } = await api.post('/api/ai/chat', {
        patientId: String(patientId),
        message: messageText,
        language: language
      });

      const answerText = data.answer || data.reply || "No response received from clinical records.";
      const botMsgId = `ai-${Date.now()}`;

      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          sender: 'ai',
          text: answerText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestUpdate: data.suggestUpdateCheckup || /check[- ]?up|record|update|பரிசோதனை|புதுப்பி/i.test(answerText)
        }
      ]);

      // Only auto-play audio if Auto Voice is explicitly enabled
      if (autoVoice) {
        handleSpeak(answerText, botMsgId);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errMsgId = `err-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: errMsgId,
          sender: 'ai',
          text: language === 'ta'
            ? 'மன்னிக்கவும், மருத்துவ பதிவுகளை பெறுவதில் பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
            : 'Unable to process clinical analysis query. Please check patient records directly.',
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearConversation = () => {
    window.speechSynthesis?.cancel();
    setActiveSpeechId(null);
    const greeting = language === 'ta'
      ? `வணக்கம் ${patientName}! இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`
      : `Hi ${patientName}! How can I help you today?`;

    setMessages([
      {
        id: `cleared-${Date.now()}`,
        sender: 'ai',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickChips = QUICK_ACTIONS[language] || QUICK_ACTIONS.en;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 rounded-2xl shadow-xl border border-primary-800/40 text-white overflow-hidden flex flex-col">
      
      {/* ── HEADER & PATIENT CONTEXT ── */}
      <div className="p-4 sm:p-5 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-primary-600 to-teal-500 rounded-xl shadow-md text-white flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white tracking-wide">
                MedCard AI Clinical Assistant
              </h3>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                GEMINI AI
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <span>Active Patient:</span>
              <strong className="text-teal-300 font-semibold">{patientName}</strong>
              <span className="text-slate-400">({healthId})</span>
              <span className="mx-1">•</span>
              <span className="text-amber-300 font-medium">Allergies: {allergies}</span>
            </p>
          </div>
        </div>

        {/* CONTROLS: Language, Auto Voice, Clear */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Language Selector */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                language === 'en'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="English"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                language === 'ta'
                  ? 'bg-teal-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="தமிழ்"
            >
              தமிழ்
            </button>
          </div>

          {/* Auto Voice Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoVoice;
              setAutoVoice(next);
              if (!next) {
                window.speechSynthesis?.cancel();
                setActiveSpeechId(null);
              }
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition ${
              autoVoice
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm'
                : 'bg-white/5 border-white/15 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto Voice: Automatically play response audio"
          >
            {autoVoice ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="font-medium text-[11px]">Auto Voice: {autoVoice ? 'ON' : 'OFF'}</span>
          </button>

          {/* Direct Update Checkup Details Action */}
          {onOpenCheckup && (
            <button
              type="button"
              onClick={onOpenCheckup}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-teal-600/40 hover:bg-teal-600/70 border border-teal-400/40 text-teal-200 hover:text-white transition font-semibold shadow-sm"
              title="Record or update patient checkup details"
            >
              <span>📝</span>
              <span className="hidden sm:inline">{language === 'ta' ? '+ பரிசோதனை பதிவு' : '+ Update Checkup'}</span>
            </button>
          )}

          {/* Clear Conversation */}
          <button
            type="button"
            onClick={handleClearConversation}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* ── QUICK PROMPT CHIPS ── */}
      <div className="p-2.5 sm:px-5 bg-black/20 border-b border-white/10 flex flex-wrap items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-teal-300 font-semibold flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" /> 
          {language === 'ta' ? 'விரைவு வினவல்கள்:' : 'Quick Queries:'}
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.query)}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-xl bg-white/10 hover:bg-primary-600 text-slate-200 hover:text-white border border-white/15 hover:border-primary-400 transition font-medium whitespace-nowrap shadow-sm disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── VOICE LISTENING INDICATOR BANNER ── */}
      {isListening && (
        <div className="bg-red-950/80 border-b border-red-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-red-200 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="font-semibold tracking-wide">
              🎙️ {language === 'ta' ? 'குரல் கேட்கிறது... தமிழில் பேசுங்கள்' : 'Listening... Speak your question in English'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="text-[11px] bg-red-900/60 hover:bg-red-800 text-white px-2.5 py-0.5 rounded-lg border border-red-400/40 font-bold"
          >
            Stop Mic
          </button>
        </div>
      )}

      {/* Voice Error Notification */}
      {voiceError && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{voiceError}</span>
        </div>
      )}

      {/* ── CHAT THREAD ── */}
      <div className="p-4 sm:p-5 max-h-[460px] min-h-[280px] overflow-y-auto space-y-4 bg-slate-950/40">
        {messages.map((msg) => {
          const isUser = msg.sender === 'doctor' || msg.sender === 'user';
          const isSpeakingThis = activeSpeechId === msg.id;

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 space-y-2.5 shadow-md ${
                isUser
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : msg.isError
                    ? 'bg-red-950/80 border border-red-500/40 text-red-200 rounded-tl-none'
                    : 'bg-slate-900/95 border border-cyan-500/20 text-slate-100 rounded-tl-none'
              }`}>
                
                {/* Meta header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 text-[11px] font-mono text-slate-400">
                  <span className={`font-bold flex items-center gap-1 ${isUser ? 'text-white' : 'text-teal-300'}`}>
                    {isUser ? '👨‍⚕️ Attending Doctor' : '🤖 MedCard AI'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Speaker Button for AI responses */}
                    {!isUser && !msg.isError && (
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg.text, msg.id)}
                        className={`p-1 rounded-lg transition ${
                          isSpeakingThis
                            ? 'bg-teal-500/30 text-teal-300 ring-1 ring-teal-400 animate-pulse'
                            : 'text-slate-400 hover:text-teal-300 hover:bg-white/10'
                        }`}
                        title={isSpeakingThis ? 'Stop speaking' : 'Read answer aloud (Text-to-Speech)'}
                      >
                        {isSpeakingThis ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {/* Message Content */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={pIdx}>
                        {parts.map((part, partIdx) => 
                          partIdx % 2 === 1 ? (
                            <strong key={partIdx} className={isUser ? 'text-white font-bold underline' : 'text-teal-300 font-bold'}>
                              {part}
                            </strong>
                          ) : part
                        )}
                      </p>
                    );
                  })}
                </div>

                {/* Interactive button to log / update current check-up details */}
                {!isUser && !msg.isError && onOpenCheckup && (
                  <div className="pt-2 border-t border-white/10 mt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenCheckup}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition transform hover:scale-[1.02]"
                    >
                      <span>📝</span>
                      <span>{language === 'ta' ? '+ தற்போதைய பரிசோதனை விவரங்களை பதிவு செய்க' : '+ Update Current Check-up Details'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Animation */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-teal-500/30 text-slate-300 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-3 text-xs shadow-md">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-200">MedCard AI querying MySQL & Gemini</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT FORM & CONTROLS ── */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-white/10 space-y-2">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/30 ring-2 ring-red-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isListening ? 'Stop recording voice' : `Click to speak (${language === 'ta' ? 'Tamil' : 'English'})`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-teal-400" />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === 'ta'
                ? "நோயாளியின் ஒவ்வாமை, மருந்துகள், முந்தைய நோய்கள் பற்றி கேளுங்கள்..."
                : "Ask about allergies, medications, clinical diagnoses, or lab reports..."
            }
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-500"
            disabled={loading}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
          <span className="flex items-center gap-1 text-teal-400 font-mono">
            <ShieldCheck className="w-3 h-3" /> Secure Doctor-Verified Session
          </span>
          <span>
            {language === 'ta' ? 'தமிழ் & English ஆதரவு' : 'English & Tamil Supported'}
          </span>
        </div>
      </div>

    </div>
  );
}
