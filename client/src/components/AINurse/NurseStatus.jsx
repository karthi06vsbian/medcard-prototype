import React from 'react';
import { Sparkles, Mic, Volume2, ShieldAlert, CheckCircle2, HeartPulse, Hand } from 'lucide-react';

const NURSE_STATUS_CONFIG = {
  idle: {
    label: 'Ready to help',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50',
    icon: null
  },
  greeting: {
    label: 'Saying Hello! 👋',
    dotColor: 'bg-amber-500 animate-bounce',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    icon: Sparkles
  },
  listening: {
    label: 'Listening...',
    dotColor: 'bg-teal-500 animate-ping',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-300',
    bgColor: 'bg-teal-50',
    icon: Mic
  },
  thinking: {
    label: 'Thinking...',
    dotColor: 'bg-purple-500 animate-pulse',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    bgColor: 'bg-purple-50',
    icon: Sparkles
  },
  speaking: {
    label: 'Speaking...',
    dotColor: 'bg-[#0B5ED7] animate-pulse',
    textColor: 'text-[#0B5ED7]',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    icon: Volume2
  },
  warning: {
    label: 'Urgent Care Notice',
    dotColor: 'bg-red-500 animate-bounce',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    icon: ShieldAlert
  },
  success: {
    label: 'Confirmed',
    dotColor: 'bg-green-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
    icon: CheckCircle2
  }
};

export default function NurseStatus({ state = 'idle', patientName = 'Patient' }) {
  const normState = (state || 'idle').toLowerCase();
  const config = NURSE_STATUS_CONFIG[normState] || NURSE_STATUS_CONFIG.idle;
  const Icon = config.icon;

  return (
    <div className="w-full flex items-center justify-between pt-3 border-t border-slate-200/80 z-10 text-xs flex-wrap gap-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.borderColor} ${config.bgColor} shadow-2xs transition-all duration-300`}>
        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className={`font-bold text-[11px] ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      <div className="text-[11px] font-mono text-slate-600 font-semibold bg-white px-3 py-1 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5">
        <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
        Patient: <strong className="text-[#172B4D]">{patientName}</strong>
      </div>
    </div>
  );
}
