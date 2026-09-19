import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, AlertTriangle, Calendar, Stethoscope, Thermometer, Brain, Pill, 
  Heart, Wind, Shield, ArrowRight, Sparkles, Activity, FileText, CheckCircle2, 
  Droplets, Bone, Lock, MapPin, Mic, MicOff, Volume2, VolumeX, Globe, RefreshCw,
  PhoneCall, ShieldAlert, HeartPulse
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import AINurse from '../../components/AINurse';

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', code: 'en-US', flag: '🇬🇧' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', code: 'ta-IN', flag: '🇮🇳' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', code: 'hi-IN', flag: '🇮🇳' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు', code: 'te-IN', flag: '🇮🇳' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', code: 'kn-IN', flag: '🇮🇳' },
  { id: 'ml', label: 'Malayalam', native: 'മലയാളം', code: 'ml-IN', flag: '🇮🇳' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা', code: 'bn-IN', flag: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'मराठी', code: 'mr-IN', flag: '🇮🇳' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી', code: 'gu-IN', flag: '🇮🇳' },
  { id: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'pa-IN', flag: '🇮🇳' },
  { id: 'ur', label: 'Urdu', native: 'اردو', code: 'ur-PK', flag: '🇮🇳' },
  { id: 'es', label: 'Spanish', native: 'Español', code: 'es-ES', flag: '🇪🇸' },
  { id: 'fr', label: 'French', native: 'Français', code: 'fr-FR', flag: '🇫🇷' },
  { id: 'de', label: 'German', native: 'Deutsch', code: 'de-DE', flag: '🇩🇪' },
  { id: 'ar', label: 'Arabic', native: 'العربية', code: 'ar-SA', flag: '🇸🇦' }
];

const QUICK_PROMPT_CHIPS = [
  { label: '🌡️ Fever Assessment', text: 'I am having fever' },
  { label: '🥗 Can I eat this fruit/food?', text: 'Can I eat banana and apple with my current health condition?' },
  { label: '🔍 Explain Details of Diet', text: 'Can you explain the details and nutritional impact of this food for my body?' },
  { label: '📋 Explain My Medical Reports', text: 'Please analyze and explain all my medical reports and blood test parameters.' },
  { label: '🧬 My Health Profile & Vitals', text: 'Explain my recorded vitals, BMI, and body constitution.' },
  { label: '⚠️ Allergy Safety Verification', text: 'Check my recorded allergies and safety instructions.' },
  { label: '🤧 Cold, Runny Nose & Cough', text: 'I have cold, sneezing, and runny nose with mild throat irritation' },
  { label: '🤢 Stomach Acidity & Pain', text: 'My stomach is burning with acidity and discomfort' }
];

export default function AIChatbot() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [nurseState, setNurseState] = useState('IDLE');
  const [speechBubbleText, setSpeechBubbleText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [emergencyAlert, setEmergencyAlert] = useState(false);
  const [mobileView, setMobileView] = useState('chat'); // 'chat' | 'voice'

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // 1. Initial Load: Fetch Profile & Saved Language
  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/patient/profile');
      setProfile(data);
      const savedLang = data.preferred_language || localStorage.getItem('medicard_ai_lang') || 'en';
      setSelectedLanguage(savedLang);

      // Check if first login in this session
      const hasSeenLangPrompt = sessionStorage.getItem('medicard_lang_prompt_seen');
      if (!hasSeenLangPrompt) {
        setShowLanguageModal(true);
      } else {
        initGreeting(data.name, savedLang);
      }
    } catch (err) {
      console.error(err);
      initGreeting('Patient', 'en');
    }
  };

  const initGreeting = (name, lang) => {
    const firstName = name ? name.split(' ')[0] : 'there';
    setNurseState('GREETING');
    let greetingMessage = `Hello ${firstName}! 👋 I'm **Medi Card AI Nurse Assistant**.\n\nI am connected to your authenticated medical history, diagnostic reports, and physical health profile.\n\nHow can I help you today? You can describe your symptoms, ask me to explain medical reports, or check when to consult a doctor.`;
    
    if (lang === 'ta') {
      greetingMessage = `வணக்கம் ${firstName}! 👋 நான் உங்கள் **மெடி கார்டு AI செவிலியர் உதவியாளர்**.\n\nஉங்கள் மருத்துவ வரலாறு, ஆய்வக அறிக்கைகள் மற்றும் உடல்நல விவரங்களை நான் அறிந்துள்ளேன்.\n\nஇன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`;
    } else if (lang === 'hi') {
      greetingMessage = `नमस्ते ${firstName}! 👋 मैं आपकी **मेडी कार्ड एआई नर्स सहायक** हूँ।\n\nमैं आपके मेडिकल रिकॉर्ड, जांच रिपोर्ट और स्वास्थ्य प्रोफाइल से जुड़ी हूँ।\n\nआज मैं आपकी क्या सहायता कर सकती हूँ?`;
    }

    setMessages([
      {
        id: 1,
        sender: 'bot',
        text: greetingMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setSpeechBubbleText(`Hello ${firstName}! 👋 I'm your AI Nurse Assistant. How are you feeling today?`);
    // Show greeting/waving animation first for 1.2s, then speak
    setTimeout(() => {
      speakText(greetingMessage, lang);
    }, 1200);
    setTimeout(() => setNurseState('IDLE'), 6000);
  };



  const handleLanguageSelect = async (langId) => {
    setSelectedLanguage(langId);
    localStorage.setItem('medicard_ai_lang', langId);
    sessionStorage.setItem('medicard_lang_prompt_seen', 'true');
    setShowLanguageModal(false);

    try {
      await api.post('/api/patient/language', { language: langId });
    } catch (e) {}

    initGreeting(profile?.name || 'Patient', langId);
  };

  const utteranceRef = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioContextRef = useRef(null);

  // Play a pleasant medical chime to verify audio hardware & wake up Web Audio
  const playAudioChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  };

  // Initialize and load Speech Voices cleanly
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Auto-unlock audio on first user touch / click anywhere on page
    const unlockOnGesture = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      setAudioUnlocked(true);
    };

    window.addEventListener('click', unlockOnGesture, { once: true });
    window.addEventListener('keydown', unlockOnGesture, { once: true });
    return () => {
      window.removeEventListener('click', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, []);

  // 2. Text-to-Speech Engine – Female Voice with Guaranteed Browser Playback
  const speakText = (rawText, langCode = selectedLanguage) => {
    if (isVoiceMuted || !('speechSynthesis' in window)) return;

    try {
      playAudioChime();
      window.speechSynthesis.cancel();

      // Clean markdown for crystal-clear audio output
      const cleanText = rawText
        .replace(/[*#_~`]/g, '')
        .replace(/SYMPTOM SUMMARY|GENERAL GUIDANCE|MONITOR|WHEN TO SEE A DOCTOR|ACTION/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 400);

      if (!cleanText) return;

      const doSpeak = () => {
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();

          const utterance = new SpeechSynthesisUtterance(cleanText);
          utteranceRef.current = utterance;
          window._activeUtterance = utterance;

          const langObj = LANGUAGES.find(l => l.id === langCode) || LANGUAGES[0];
          utterance.lang = langObj.code;
          utterance.rate = 0.95;
          utterance.pitch = 1.15;

          // Voice priority selection: First find exact or prefix language match
          const allVoices = window.speechSynthesis.getVoices() || [];
          let chosenVoice = null;

          // 1. First priority: Exact language match (e.g. hi-IN, ta-IN, es-ES)
          chosenVoice = allVoices.find(v => v.lang.toLowerCase() === langObj.code.toLowerCase());

          // 2. Second priority: Language prefix match (e.g. 'ta', 'hi', 'bn', 'te', 'es', 'fr')
          if (!chosenVoice) {
            chosenVoice = allVoices.find(v => v.lang.toLowerCase().startsWith(langObj.id.toLowerCase()));
          }

          // 3. Third priority: High quality female voice for English or fallback
          if (!chosenVoice) {
            const FEMALE_PRIORITY = [
              'Samantha', 'Victoria', 'Karen', 'Moira', 'Tessa', 'Fiona',
              'Google UK English Female', 'Google US English',
              'Microsoft Zira', 'Microsoft Jenny', 'Microsoft Aria',
              'Veena', 'Lekha'
            ];
            for (const kw of FEMALE_PRIORITY) {
              chosenVoice = allVoices.find(v => v.name.toLowerCase().includes(kw.toLowerCase()));
              if (chosenVoice) break;
            }
          }

          // 4. First available
          if (!chosenVoice && allVoices.length > 0) {
            chosenVoice = allVoices[0];
          }

          if (chosenVoice) {
            utterance.voice = chosenVoice;
            console.log('[Nurse Voice]', chosenVoice.name, chosenVoice.lang);
          }

          utterance.onstart = () => {
            setIsSpeaking(true);
            setNurseState('SPEAKING');
            setAudioUnlocked(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            setNurseState('IDLE');
          };

          utterance.onerror = (e) => {
            if (e.error !== 'interrupted') console.warn('Speech synthesis:', e.error);
            setIsSpeaking(false);
            setNurseState('IDLE');
          };

          window.speechSynthesis.speak(utterance);

          // Chrome keep-alive: prevents cutting mid-sentence
          const keepAlive = setInterval(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            } else {
              clearInterval(keepAlive);
            }
          }, 5000);

        } catch (e) {
          console.error('speakText inner:', e);
          setIsSpeaking(false);
          setNurseState('IDLE');
        }
      };

      setTimeout(doSpeak, 80);

    } catch (err) {
      console.error('Speech synthesis error:', err);
      setIsSpeaking(false);
      setNurseState('IDLE');
    }
  };

  // 3. Web Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError('Voice input is not supported in this browser. Please use text input.');
      setTimeout(() => setVoiceError(''), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setNurseState('IDLE');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    const langObj = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];
    recognition.lang = langObj.code;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setNurseState('LISTENING');
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setNurseState('IDLE');
      if (event.error !== 'no-speech') {
        setVoiceError(`Voice recognition error: ${event.error}`);
        setTimeout(() => setVoiceError(''), 4000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (nurseState === 'LISTENING') setNurseState('IDLE');
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Send Message Handler
  const sendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text || !text.trim() || loading) return;

    setInput('');
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setNurseState('THINKING');

    try {
      const { data } = await api.post('/api/ai/chat', {
        message: text,
        language: selectedLanguage
      });

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply,
        zone: data.zone || 'green',
        emergency: data.emergency || false,
        escalated: data.escalated || false,
        doctorPrompt: data.doctorPrompt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      setSpeechBubbleText(data.reply);
      setEmergencyAlert(data.emergency || false);
      setNurseState(data.emergency ? 'WARNING' : data.escalated ? 'WARNING' : 'SPEAKING');

      // Speak response
      speakText(data.reply, selectedLanguage);

    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "Sorry, I am having trouble connecting to the AI assistant right now. You can still access your Medical Records and Appointments directly.",
        isError: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      setNurseState('IDLE');
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    try {
      await api.post('/api/patient/sos', { location_text: 'Current GPS Location (Triggered from AI Nurse Assistant)' });
      alert('🚨 Emergency SOS dispatched! Ambulance & emergency responders have been alerted.');
      navigate('/patient/sos');
    } catch (e) {
      navigate('/patient/sos');
    }
  };

  return (
    <Layout role="patient">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary-600 to-teal-600 text-white rounded-2xl shadow-sm shrink-0">
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-extrabold text-darknavy">AI Nurse Assistant</h1>
                <span className="text-[10px] bg-primary-100 text-primary-800 border border-primary-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  AI VOICE
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Connected to authenticated medical records, laboratory parameters & vital indicators
              </p>
            </div>
          </div>

          {/* Language Selector & Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-darknavy">
              <Globe className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageSelect(e.target.value)}
                className="bg-transparent outline-none font-bold text-darknavy cursor-pointer text-xs"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.flag} {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                speakText(`Hello ${profile?.name?.split(' ')[0] || 'Patient'}, audio sound is working perfectly! I am your AI Nurse Assistant.`, selectedLanguage);
              }}
              className="px-2.5 py-1.5 text-xs text-teal-800 hover:text-teal-900 font-bold bg-teal-50 hover:bg-teal-100 rounded-xl transition border border-teal-200 flex items-center gap-1 shadow-2xs shrink-0"
              title="Click to test audio sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Test Sound</span>
            </button>
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on mobile/tablet screens < lg) */}
        <div className="lg:hidden flex items-center justify-center p-1 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => setMobileView('chat')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mobileView === 'chat'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-darknavy'
            }`}
          >
            💬 Chat Consultation
          </button>
          <button
            type="button"
            onClick={() => setMobileView('voice')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mobileView === 'voice'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-darknavy'
            }`}
          >
            🎙️ Voice & Nurse Orb
          </button>
        </div>

        {/* Emergency Alert Banner if detected */}
        {emergencyAlert && (
          <div className="bg-red-50 border-2 border-red-500 text-red-950 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-bounce-short">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-red-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-red-900">⚠️ Urgent Medical Attention Recommended</h4>
                <p className="text-xs text-red-800">Your described symptoms indicate a potential medical emergency. Seek immediate care.</p>
              </div>
            </div>
            <button
              onClick={handleSOS}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4" /> Trigger Emergency SOS
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            SPLIT SCREEN LAYOUT: 3D Virtual Nurse + Chat Thread
           ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT: 3D Nurse Character Panel (5 Columns on Desktop) */}
          <div className={`lg:col-span-5 ${mobileView === 'voice' ? 'block' : 'hidden lg:block'} h-[480px] sm:h-[520px] lg:h-[620px]`}>
            <AINurse
              state={nurseState}
              speechText={speechBubbleText}
              isSpeaking={isSpeaking}
              isMuted={isVoiceMuted}
              onToggleMute={() => {
                if (!isVoiceMuted) window.speechSynthesis?.cancel();
                setIsVoiceMuted(!isVoiceMuted);
              }}
              onReplayVoice={() => {
                if (speechBubbleText) {
                  speakText(speechBubbleText, selectedLanguage);
                } else if (messages.length > 0) {
                  const lastBot = [...messages].reverse().find(m => m.sender === 'bot');
                  if (lastBot) speakText(lastBot.text, selectedLanguage);
                }
              }}
              onTriggerVoiceInput={toggleVoiceInput}
              isListening={isListening}
              language={selectedLanguage}
              patientName={profile?.name || 'Patient'}
            />
          </div>

          {/* RIGHT: Interactive Clinical Chat Panel (7 Columns on Desktop) */}
          <div className={`lg:col-span-7 ${mobileView === 'chat' ? 'flex' : 'hidden lg:flex'} flex-col h-[calc(100vh-14rem)] min-h-[500px] lg:h-[620px] bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden`}>
            
            {/* Chat Panel Header with Live Voice Pulse */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-primary-50/30 to-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${
                    isListening ? 'bg-red-500 animate-ping' : isSpeaking ? 'bg-teal-500 animate-pulse' : 'bg-green-500'
                  }`} />
                </div>
                <div>
                  <span className="text-xs font-bold text-darknavy block">
                    {isListening ? '🎙️ Listening to you...' : isSpeaking ? '🔊 Nurse Speaking...' : '👩‍⚕️ AI Nurse Assistant'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    {LANGUAGES.find(l => l.id === selectedLanguage)?.native || 'English'} • Clinical Guidance Stream
                  </span>
                </div>
              </div>

              {/* Quick Voice Controls right inside Chat Header */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`px-2.5 py-1 rounded-xl transition text-xs flex items-center gap-1 font-bold ${
                    isListening
                      ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                      : 'bg-white text-primary-700 border border-slate-200 hover:bg-primary-50'
                  }`}
                  title={isListening ? "Stop voice input" : "Start speaking (Microphone)"}
                >
                  <Mic className="w-3.5 h-3.5 text-primary-600" />
                  <span className="text-[11px]">{isListening ? 'Listening...' : 'Voice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isVoiceMuted) window.speechSynthesis?.cancel();
                    setIsVoiceMuted(!isVoiceMuted);
                  }}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
                  title={isVoiceMuted ? "Unmute nurse voice" : "Mute nurse voice"}
                >
                  {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              </div>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F5F9FF]/60">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl p-4 space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-none shadow-sm'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-900 rounded-tl-none'
                        : 'bg-white border border-slate-200/80 text-darknavy rounded-tl-none shadow-sm'
                  }`}>
                    
                    {/* Sender Tag & Timestamp */}
                    <div className="flex items-center justify-between gap-2 text-[11px] opacity-80 border-b border-black/5 pb-1">
                      <span className="font-bold flex items-center gap-1">
                        {msg.sender === 'user' ? '👤 You' : '👩‍⚕️ Medi Card Nurse'}
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.sender === 'bot' && !msg.isError && (
                          <button
                            type="button"
                            onClick={() => speakText(msg.text, selectedLanguage)}
                            className="text-primary-600 hover:text-primary-800 font-bold flex items-center gap-0.5 transition p-0.5 rounded hover:bg-primary-50"
                            title="Listen to this message"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Play</span>
                          </button>
                        )}
                        <span>{msg.time}</span>
                      </div>
                    </div>

                    {/* Message Body with Markdown formatting */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-1.5">
                      {msg.text.split('\n\n').map((para, pIdx) => {
                        const parts = para.split(/\*\*(.*?)\*\*/g);
                        return (
                          <p key={pIdx}>
                            {parts.map((part, partIdx) => 
                              partIdx % 2 === 1 ? <strong key={partIdx} className="text-primary-800 font-bold">{part}</strong> : part
                            )}
                          </p>
                        );
                      })}
                    </div>

                    {/* Escalation CTA (Book Appointment) */}
                    {msg.escalated && (
                      <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <Link
                          to="/patient/appointments"
                          className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Book Doctor Appointment
                        </Link>
                        <Link
                          to="/patient/medical-history"
                          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Medical History
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2.5 text-xs text-slate-600 shadow-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                    <span>Nurse Assistant is analyzing records and synthesizing guidance...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary-600" /> Suggestions:
              </span>
              {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(chip.text)}
                  className="text-xs px-2.5 py-1 bg-white hover:bg-primary-50 text-slate-700 hover:text-primary-700 border border-slate-200 rounded-full whitespace-nowrap transition font-medium shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Error banner if voice error */}
            {voiceError && (
              <div className="px-4 py-1.5 bg-amber-50 text-amber-800 text-xs border-t border-amber-200">
                {voiceError}
              </div>
            )}

            {/* Chat Input Bar with Microphone & Send */}
            <div className="p-3 bg-white border-t border-slate-200/80">
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                {/* Microphone Voice Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-xl transition shadow-xs flex items-center justify-center ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                      : 'bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200'
                  }`}
                  title={isListening ? 'Stop Listening' : 'Speak to AI Nurse (Voice Input)'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Listening to your voice..." : "Describe symptoms, ask about reports, or check vital signs..."}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-darknavy focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-400"
                  disabled={loading}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>

              {/* Safety Disclaimers */}
              <p className="text-[10px] text-slate-400 text-center mt-2">
                ⚕️ <strong className="text-slate-500">Information & Guidance Assistant:</strong> Medi Card AI Nurse does not provide autonomous diagnoses or prescriptions. In emergencies, contact local emergency services immediately.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════
          FIRST LOGIN / LANGUAGE SELECTION MODAL
         ═══════════════════════════════════════════════════════ */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold">
                Hi {profile?.name ? profile.name.split(' ')[0] : 'there'}! 👋
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                I'm your <strong>Medi Card AI Health Assistant</strong>. Which language would you prefer to interact in?
              </p>
            </div>

            {/* Language Selection Grid */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleLanguageSelect(lang.id)}
                    className={`p-4 rounded-2xl border text-left transition flex items-center justify-between group ${
                      selectedLanguage === lang.id
                        ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-primary-50/50 hover:border-primary-300'
                    }`}
                  >
                    <div>
                      <span className="text-lg mr-1.5">{lang.flag}</span>
                      <span className="font-extrabold text-darknavy text-sm block group-hover:text-primary-700">
                        {lang.native}
                      </span>
                      <span className="text-xs text-slate-500">{lang.label}</span>
                    </div>
                    {selectedLanguage === lang.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                You can change your preferred language anytime from the top bar.
              </p>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}
