import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, UserPlus, CreditCard, Globe, FileText, MessageSquare, AlertCircle, Pill, Volume2, VolumeX } from 'lucide-react';

export default function LandingPage() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.warn('Audio play notice:', e));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#172B4D]">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <img src="/medicard-icon.png" alt="MediCard Logo" className="h-9 w-9 rounded-xl object-contain shadow-xs" />
              <span className="text-2xl font-bold text-[#172B4D] tracking-tight">MediCard</span>
            </div>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-primary-50 via-[#F5F9FF] to-[#F5F9FF] pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div className="mb-12 lg:mb-0">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#172B4D] tracking-tight mb-4">
                Your Health, <span className="text-primary-600">One ID</span>
              </h1>
              <p className="text-lg text-[#64748B] mb-8 max-w-xl">
                A Universal Digital Health Identity platform connecting patients, doctors, pharmacies, and emergency services seamlessly.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-md transition duration-150 ease-in-out"
              >
                Get Started
              </Link>
            </div>
            
            {/* Hero Video */}
            <div className="relative h-64 sm:h-80 lg:h-96 w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200 group">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src="/hero-video.MOV"
                autoPlay
                loop
                muted={isMuted}
                playsInline
              />

              {/* Mute / Unmute Button */}
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute video sound" : "Mute video sound"}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-black/70 hover:bg-black/85 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg border border-white/20 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                title={isMuted ? "Click to Unmute Sound" : "Click to Mute Sound"}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span>Unmute Sound</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">Sound On</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#172B4D]">How It Works</h2>
            <p className="mt-4 text-lg text-[#64748B]">Three simple steps to secure your digital health identity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#F5F9FF] rounded-2xl p-8 text-center border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-6">
                <UserPlus className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-[#172B4D] mb-3">Register</h3>
              <p className="text-[#64748B]">Create your universal health profile with a unique MediCard.</p>
            </div>
            <div className="bg-[#F5F9FF] rounded-2xl p-8 text-center border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="mx-auto h-16 w-16 bg-secondary-100 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-bold text-[#172B4D] mb-3">Get Your Health ID</h3>
              <p className="text-[#64748B]">Receive your digital health card with QR code for instant access.</p>
            </div>
            <div className="bg-[#F5F9FF] rounded-2xl p-8 text-center border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="mx-auto h-16 w-16 bg-accent-100 rounded-full flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-[#172B4D] mb-3">Access Anywhere</h3>
              <p className="text-[#64748B]">Connect with doctors, pharmacies, and emergency services nationwide.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-[#F5F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#172B4D]">Platform Features</h2>
            <p className="mt-4 text-lg text-[#64748B]">Everything you need to manage your health in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <FileText className="h-8 w-8 text-primary-600 mb-4" />
              <h4 className="text-lg font-bold text-[#172B4D] mb-2">Medical History</h4>
              <p className="text-sm text-[#64748B]">Access all your past medical records, prescriptions, and lab reports securely.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <MessageSquare className="h-8 w-8 text-secondary-600 mb-4" />
              <h4 className="text-lg font-bold text-[#172B4D] mb-2">AI Chatbot</h4>
              <p className="text-sm text-[#64748B]">Get instant preliminary health advice and auto-book appointments based on symptoms.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <AlertCircle className="h-8 w-8 text-[#DC2626] mb-4" />
              <h4 className="text-lg font-bold text-[#172B4D] mb-2">SOS Emergency</h4>
              <p className="text-sm text-[#64748B]">Send instant alerts to nearest ambulances with your location and medical profile.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <Pill className="h-8 w-8 text-secondary-600 mb-4" />
              <h4 className="text-lg font-bold text-[#172B4D] mb-2">Medicine Tracking</h4>
              <p className="text-sm text-[#64748B]">Track your prescribed medicines from pharmacy to your doorstep in real-time.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img src="/medicard-icon.png" alt="MediCard Logo" className="h-7 w-7 rounded-lg object-contain" />
            <span className="text-xl font-bold text-[#172B4D]">MediCard</span>
          </div>
          <p className="text-[#64748B] text-sm">© 2024 MediCard. Built for Smart India Hackathon.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-[#64748B] hover:text-primary-600 text-sm">Privacy Policy</a>
            <a href="#" className="text-[#64748B] hover:text-primary-600 text-sm">Terms of Service</a>
            <a href="#" className="text-[#64748B] hover:text-primary-600 text-sm">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

