import React from 'react';

const StatusBadge = ({ status }) => {
  const normalizedStatus = status ? status.toLowerCase() : '';
  
  let colorClasses = 'bg-slate-100 text-slate-700 border border-slate-200';
  
  if (['delivered', 'completed', 'verified', 'active policy', 'optimal', 'normal'].includes(normalizedStatus)) {
    colorClasses = 'bg-green-50 text-[#16A34A] border border-green-200';
  } else if (['scheduled', 'ordered', 'received', 'pending'].includes(normalizedStatus)) {
    colorClasses = 'bg-amber-50 text-[#F59E0B] border border-amber-200';
  } else if (['packed', 'dispatched', 'in progress'].includes(normalizedStatus)) {
    colorClasses = 'bg-blue-50 text-[#0B5ED7] border border-blue-200';
  } else if (['out for delivery', 'en route to hospital', 'reached patient'].includes(normalizedStatus)) {
    colorClasses = 'bg-cyan-50 text-[#0891b2] border border-cyan-200';
  } else if (['cancelled', 'emergency', 'alert sent', 'high', 'danger'].includes(normalizedStatus)) {
    colorClasses = 'bg-red-50 text-[#DC2626] border border-red-200';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colorClasses}`}>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;

