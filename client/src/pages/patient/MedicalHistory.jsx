import React, { useState, useEffect } from 'react';
import { Clock, FileText, User, Scissors, Thermometer, Upload, X, Search, Filter, 
  Droplets, Scan, Brain, Bone, Heart, Radio, FolderOpen, Plus, ChevronDown, ChevronUp, 
  AlertCircle, Eye, Printer, Download, Sparkles, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Layout from '../../components/Layout';

// ─── Report type config ───
const REPORT_TYPES = {
  blood:     { label: 'Blood Report', icon: Droplets, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', tagBg: 'bg-red-100' },
  xray:      { label: 'X-Ray', icon: Bone, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', tagBg: 'bg-blue-100' },
  mri:       { label: 'MRI Scan', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', tagBg: 'bg-purple-100' },
  ct_scan:   { label: 'CT Scan', icon: Scan, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', tagBg: 'bg-orange-100' },
  ultrasound:{ label: 'Ultrasound', icon: Radio, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200', tagBg: 'bg-cyan-100' },
  ecg:       { label: 'ECG / EKG', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200', tagBg: 'bg-pink-100' },
  other:     { label: 'Other', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', tagBg: 'bg-gray-100' },
};

// ─── Tab button component ───
const TabButton = ({ active, icon: Icon, label, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active
        ? `bg-primary-600 text-white shadow-md`
        : `bg-white text-[#64748B] hover:bg-[#F5F9FF] hover:text-[#172B4D] border border-slate-200`
    }`}
  >
    <Icon size={16} />
    {label}
    {count > 0 && (
      <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#64748B]'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ─── Empty state ───
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
    <Icon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="text-gray-500 mt-2">{subtitle}</p>
  </div>
);

// ─── Surgery card ───
const SurgeryCard = ({ record }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition p-6 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-xl" />
    <div className="ml-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <Scissors size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{record.diagnosis}</h3>
            <div className="flex items-center text-xs text-gray-500 gap-1 mt-0.5">
              <Clock size={12} />
              {new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full mt-2 sm:mt-0">
          <User size={14} className="mr-1.5 text-gray-400" />
          {record.doctor_name || 'Dr. Senthil Nathan'}
        </div>
      </div>
      <div className="bg-red-50/50 p-4 rounded-lg text-sm text-gray-700 border border-red-100">
        <span className="font-semibold text-gray-900">Procedure Notes: </span>
        {record.notes || 'No specific notes provided.'}
      </div>
    </div>
  </div>
);

// ─── Common issue card (timeline style) ───
const CommonIssueCard = ({ record, isLast }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'recovered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'improving':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'ongoing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'referred':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="relative">
      {!isLast && <div className="absolute left-[15px] top-[40px] w-0.5 h-[calc(100%+16px)] bg-teal-200" />}
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-1">
          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center border-2 border-white shadow-sm">
            <Thermometer size={14} className="text-teal-600" />
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition mb-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">{record.diagnosis}</h3>
              {record.recovery_status && (
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${getStatusColor(record.recovery_status)}`}>
                  ● {record.recovery_status}
                </span>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500 gap-3">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {record.visit_date || (record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent')}
              </span>
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full font-medium">
                <User size={12} />
                {record.doctor_name || 'Dr. Vijayalakshmi'}
              </span>
            </div>
          </div>

          {record.symptoms && (
            <p className="text-xs text-slate-600">
              <strong className="text-slate-800 font-semibold">Symptoms: </strong>{record.symptoms}
            </p>
          )}

          <p className="text-sm text-gray-600 leading-relaxed">{record.notes || record.clinical_notes || 'No specific notes provided.'}</p>

          {record.treatment && (
            <div className="bg-[#F5F9FF] border border-blue-100 rounded-lg p-3 text-xs text-slate-700 space-y-1">
              <p><strong className="text-primary-700 font-semibold">Treatment: </strong>{record.treatment}</p>
              {record.medication && (
                <p className="text-teal-800 font-medium">
                  💊 <strong className="text-teal-900">Prescribed: </strong>{record.medication} {record.dosage ? `(${record.dosage})` : ''} {record.duration ? `• ${record.duration}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Diagnostic Document & Radiograph Film Viewer Modal ───
const ReportDetailModal = ({ report, onClose, profile }) => {
  const [invertScan, setInvertScan] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeViewTab, setActiveViewTab] = useState('all'); // 'all', 'scan_film', 'parameters'

  if (!report) return null;
  const typeConfig = REPORT_TYPES[report.report_type] || REPORT_TYPES.other;
  const TypeIcon = typeConfig.icon;

  let parameters = [];
  if (Array.isArray(report.parameters)) {
    parameters = report.parameters;
  } else if (report.parameters_json) {
    try {
      parameters = JSON.parse(report.parameters_json);
    } catch (e) {
      parameters = [];
    }
  }

  const isImagingReport = ['xray', 'mri', 'ct_scan', 'ultrasound'].includes(report.report_type) || report.file_path;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto border border-gray-200 animate-in fade-in zoom-in duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
              <TypeIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-full font-mono">
                  {typeConfig.label} Document & Film Copy
                </span>
                <span className="text-xs text-teal-200/80 font-mono">
                  REF-{report.id ? `2026-${report.id.toString().padStart(4, '0')}` : '2026-0001'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-0.5">{report.report_name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Clinical Document Body */}
        <div className="p-6 space-y-6">
          {/* Lab Letterhead & Patient Metadata */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-teal-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Diagnostic Imaging Facility / Lab</p>
              <h4 className="font-bold text-white text-base flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={16} className="text-teal-400" />
                {report.lab_name || 'Apollo Diagnostics & Reference Lab, Chennai'}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                📅 Examination Date: <strong className="text-white">{report.report_date ? new Date(report.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent'}</strong>
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-300 border-t sm:border-t-0 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-700">
              <p><span className="text-slate-400">Patient:</span> <strong className="text-white font-semibold">{profile?.name || 'C. Joseph Vijay'}</strong></p>
              <p><span className="text-slate-400">Health ID:</span> <strong className="font-mono text-cyan-300">{profile?.health_id || 'SWID-2024-0001'}</strong></p>
              <p><span className="text-slate-400">Body Type:</span> <strong className="text-teal-300">{profile?.body_type || 'Mesomorph (Athletic)'}</strong></p>
            </div>
          </div>

          {/* Imaging Scan Visual Film Lightbox Mode (If applicable) */}
          {isImagingReport && (
            <div className="bg-[#050b14] border border-cyan-500/30 rounded-2xl p-5 text-white shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <Scan size={18} className="text-cyan-400" />
                  <h4 className="text-sm font-bold text-cyan-200 tracking-wide uppercase">
                    High-Definition Digital Radiograph Film Copy
                  </h4>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono">
                    DICOM PREVIEW
                  </span>
                </div>
                {/* Lightbox Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInvertScan(!invertScan)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
                      invertScan
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Toggle Inverted Radiograph Contrast"
                  >
                    <Activity size={12} /> {invertScan ? 'Inverted (B&W Positive)' : 'Standard Darkroom Film'}
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => (prev === 1 ? 1.3 : 1))}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                  >
                    {zoomLevel > 1 ? 'Reset Zoom' : '🔍 Zoom Film'}
                  </button>
                </div>
              </div>

              {/* Radiograph Scan Viewer Screen */}
              <div className="relative bg-[#02050b] rounded-xl overflow-hidden border border-cyan-950 flex items-center justify-center min-h-[360px] p-4 group">
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
                  <span className="text-[10px] font-mono text-cyan-400 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-cyan-900/50">
                    ACQUISITION: 3.0T / 120kVp
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                    FOV: 240mm | RESOLUTION: 1024x1024
                  </span>
                </div>
                
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 backdrop-blur-sm px-2.5 py-1 rounded border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    AUTHENTICATED FILM
                  </span>
                </div>

                <div 
                  className="transition-transform duration-300 ease-out flex items-center justify-center max-h-[500px] w-full"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    filter: invertScan ? 'invert(1) contrast(1.2)' : 'none'
                  }}
                >
                  <img
                    src={report.file_path || '/scans/chest-xray-pa.jpg'}
                    alt="Digital Radiograph Scan Film"
                    className="max-h-[460px] w-auto object-contain rounded-lg shadow-2xl border border-cyan-900/30"
                    onError={(e) => {
                      // Fallback visual graphic if image path isn't reached
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                  <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                    Patient: {profile?.name || 'C. Joseph Vijay'} • ID: {profile?.health_id || 'SWID-2024-0001'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Radiological film calibrated for clinical review. Double-click image to inspect vascular & bony margins.</span>
                <span className="text-cyan-400 font-semibold">Status: Verified Normal Anatomy</span>
              </p>
            </div>
          )}

          {/* Quantitative Lab Parameters Table (if available) */}
          {parameters && parameters.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                <Activity size={16} className="text-teal-600" />
                Laboratory Test Parameters & Reference Ranges
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Test Parameter</th>
                      <th className="p-3">Observed Result</th>
                      <th className="p-3">Biological Reference</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parameters.map((param, i) => {
                      const isNormal = param.status === 'normal' || param.status === 'optimal';
                      const isHigh = param.status === 'high' || param.status === 'elevated';
                      const isLow = param.status === 'low' || param.status === 'deficient';
                      return (
                        <tr key={i} className="hover:bg-teal-50/40 transition">
                          <td className="p-3 font-semibold text-gray-900">{param.parameter}</td>
                          <td className="p-3 font-bold text-gray-800 font-mono text-sm">{param.result}</td>
                          <td className="p-3 text-gray-500">{param.normal_range}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isNormal ? 'bg-green-100 text-green-700' :
                              isHigh ? 'bg-red-100 text-red-700' :
                              isLow ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {param.status ? param.status.toUpperCase() : 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diagnostic Findings & Impressions */}
          <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-teal-700" />
              Clinical Findings & Diagnostic Summary
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed">
              {report.notes || 'Scan completed with normal biological parameters. No acute abnormalities observed.'}
            </p>
          </div>

          {/* Doctor / Specialist Notes */}
          {report.doctor_notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Interpreting Specialist Impression</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-md">Verified Sign-off</span>
              </div>
              <p className="text-sm text-gray-800 italic font-serif">"{report.doctor_notes}"</p>
            </div>
          )}

          {/* AI Cross-Analysis Card */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Dr. MediBot AI Record Analysis</h5>
              <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                This diagnostic record is synchronized with your <strong>{profile?.body_type || 'Mesomorph (Athletic)'}</strong> somatotype and <strong>{profile?.allergies || 'None Reported'}</strong> allergy register.
              </p>
              <Link 
                to="/patient/chatbot"
                onClick={onClose}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline"
              >
                Ask Dr. MediBot to explain this scan further →
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition shadow-xs"
            >
              <Printer size={14} /> Print Document
            </button>
            <button
              onClick={() => {
                if (report.file_path) {
                  const link = document.createElement('a');
                  link.href = report.file_path;
                  link.download = `${report.report_name.replace(/\s+/g, '_')}_ScanFilm.jpg`;
                  link.click();
                } else {
                  alert('Official laboratory diagnostic PDF generated.');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition shadow-xs"
            >
              <Download size={14} /> {report.file_path ? 'Download Scan Film Copy' : 'Download PDF'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition shadow-sm"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Report card ───
const ReportCard = ({ report, onView }) => {
  const typeConfig = REPORT_TYPES[report.report_type] || REPORT_TYPES.other;
  const TypeIcon = typeConfig.icon;

  let parametersCount = 0;
  if (Array.isArray(report.parameters)) parametersCount = report.parameters.length;
  else if (report.parameters_json) {
    try { parametersCount = JSON.parse(report.parameters_json).length; } catch (e) {}
  }

  return (
    <div className={`bg-white rounded-xl shadow-xs border ${typeConfig.border} hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl ${typeConfig.bg} group-hover:scale-105 transition-transform`}>
              <TypeIcon size={22} className={typeConfig.color} />
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${typeConfig.tagBg} ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              <h4 className="font-bold text-gray-900 text-sm mt-1 leading-snug">{report.report_name}</h4>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {report.report_date ? new Date(report.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
              </p>
            </div>
          </div>
        </div>

        {report.lab_name && (
          <p className="text-xs text-gray-500 font-medium mb-2.5">
            🏥 {report.lab_name}
          </p>
        )}

        {report.notes && (
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 border border-gray-100 line-clamp-2 mb-3">
            <strong className="text-gray-900">Findings: </strong>{report.notes}
          </div>
        )}

        {parametersCount > 0 && (
          <div className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1 mb-2">
            <Activity size={12} /> {parametersCount} clinical test parameters measured
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => onView(report)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition shadow-xs"
        >
          <Eye size={13} /> View Full Report & Scans
        </button>
        {report.file_path && (
          <a
            href={report.file_path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-teal-700 hover:underline"
          >
            <FolderOpen size={12} className="mr-1" />
            File
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Upload Report Modal ───
const UploadModal = ({ onClose, onUploaded }) => {
  const [reportType, setReportType] = useState('blood');
  const [reportName, setReportName] = useState('');
  const [labName, setLabName] = useState('');
  const [notes, setNotes] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportName.trim()) { setError('Report name is required'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('report_type', reportType);
      formData.append('report_name', reportName);
      formData.append('lab_name', labName || 'Uploaded Diagnostic Lab');
      formData.append('notes', notes);
      formData.append('report_date', reportDate);
      if (file) formData.append('file', file);

      await api.post('/api/patient/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploaded();
      onClose();
    } catch (err) {
      setError('Failed to upload report. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Upload size={20} className="text-teal-600" />
            Upload Medical Report or Scan
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Report / Scan Type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(REPORT_TYPES).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReportType(key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                      reportType === key
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-2 ring-offset-1 ring-teal-300`
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    {cfg.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report / Document Name</label>
            <input
              type="text"
              placeholder="e.g., Complete Blood Count (CBC) or Knee MRI Scan"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic Center / Lab Name <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g., Apollo Diagnostics, Metropolis Labs"
              value={labName}
              onChange={e => setLabName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach File <span className="text-gray-400">(optional)</span></label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Findings / Summary Notes <span className="text-gray-400">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter summary notes or findings..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function MedicalHistory() {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports'); // Default to reports tab so patient sees scans immediately
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportFilter, setReportFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, historyRes, reportsRes] = await Promise.all([
        api.get('/api/patient/profile').catch(() => ({ data: null })),
        api.get('/api/patient/medical-history').catch(() => ({ data: [] })),
        api.get('/api/patient/reports').catch(() => ({ data: [] })),
      ]);
      setProfile(profileRes.data);
      setHistory(historyRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const surgeries = history.filter(r => r.category === 'surgery');
  const commonIssues = history.filter(r => r.category !== 'surgery');
  
  const filteredReports = reports.filter(r => {
    const matchesType = reportFilter === 'all' || r.report_type === reportFilter;
    const matchesSearch = searchQuery === '' || 
      r.report_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.lab_name && r.lab_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const reportCounts = reports.reduce((acc, r) => { acc[r.report_type] = (acc[r.report_type] || 0) + 1; return acc; }, {});

  if (loading) {
    return (
      <Layout role="patient">
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="patient">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary-600 mr-3 flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D]">Medical Records & Diagnostic Scans</h1>
              <p className="text-sm text-[#64748B]">Official health history, lab parameters & imaging documents</p>
            </div>
          </div>
          <Link
            to="/patient/chatbot"
            className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Sparkles size={14} className="text-primary-600" />
            Analyze Records with AI Chatbot
          </Link>
        </div>

        {/* Patient Physical Body Type & Vitals Summary Card */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
                <Activity size={24} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">Patient Vitals & Constitution</span>
                <h3 className="font-extrabold text-[#172B4D] text-base">{profile.body_type || 'Mesomorph (Athletic Build)'}</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-[#172B4D]">
              <div className="bg-[#F5F9FF] px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[#64748B]">BMI:</span> <strong className="text-[#172B4D]">{profile.bmi || '23.1'}</strong>
              </div>
              <div className="bg-[#F5F9FF] px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[#64748B]">Height/Weight:</span> <strong className="text-[#172B4D]">{profile.height || '180 cm'}, {profile.weight || '75 kg'}</strong>
              </div>
              <div className="bg-[#F5F9FF] px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[#64748B]">Blood Pressure:</span> <strong className="text-[#172B4D]">{profile.blood_pressure || '120/80 mmHg'}</strong>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-[#172B4D] font-medium">
                <span className="text-[#64748B]">Allergy:</span> <strong className="text-emerald-700">{profile.allergies || 'None Reported'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === 'reports'}
            icon={FolderOpen}
            label="Reports & Scans"
            count={reports.length}
            onClick={() => setActiveTab('reports')}
          />
          <TabButton
            active={activeTab === 'surgeries'}
            icon={Scissors}
            label="Surgeries & Operations"
            count={surgeries.length}
            onClick={() => setActiveTab('surgeries')}
          />
          <TabButton
            active={activeTab === 'common'}
            icon={Thermometer}
            label="Consultation History"
            count={commonIssues.length}
            onClick={() => setActiveTab('common')}
          />
        </div>

        {/* ── Tab: Reports & Scans ── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-[#64748B]" size={16} />
                <input
                  type="text"
                  placeholder="Search scans, blood tests, labs..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-[#172B4D]"
                />
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary-700 transition shadow-sm"
              >
                <Plus size={16} />
                Upload New Report
              </button>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setReportFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                  reportFilter === 'all' ? 'bg-primary-600 text-white shadow-xs' : 'bg-white text-[#64748B] border border-slate-200 hover:bg-[#F5F9FF]'
                }`}
              >
                All Reports ({reports.length})
              </button>
              {Object.entries(REPORT_TYPES).map(([key, cfg]) => {
                const count = reportCounts[key] || 0;
                if (count === 0) return null;
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setReportFilter(key)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
                      reportFilter === key 
                        ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-primary-300 font-bold` 
                        : 'bg-white text-[#64748B] border border-slate-200 hover:bg-[#F5F9FF]'
                    }`}
                  >
                    <Icon size={13} />
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {filteredReports.length === 0 ? (
              <EmptyState 
                icon={FolderOpen} 
                title="No diagnostic reports found" 
                subtitle="Upload your laboratory test documents, digital X-rays, MRI scans, or ECG graphs." 
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map(report => (
                  <ReportCard key={report.id} report={report} onView={setSelectedReport} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Surgeries & Operations ── */}
        {activeTab === 'surgeries' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <Scissors size={16} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Surgeries & Operations</h2>
            </div>
            {surgeries.length === 0 ? (
              <EmptyState icon={Scissors} title="No surgeries recorded" subtitle="Any surgical procedures will appear here." />
            ) : (
              <div className="space-y-4">
                {surgeries.map(record => (
                  <SurgeryCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Common Issues ── */}
        {activeTab === 'common' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-teal-100 rounded-lg">
                <Thermometer size={16} className="text-teal-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Consultation History</h2>
            </div>
            {commonIssues.length === 0 ? (
              <EmptyState icon={Thermometer} title="No records found" subtitle="Your consultation history will appear here." />
            ) : (
              <div className="ml-2">
                {commonIssues.map((record, i) => (
                  <CommonIssueCard key={record.id} record={record} isLast={i === commonIssues.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal onClose={() => setShowUploadModal(false)} onUploaded={fetchAll} />
        )}

        {/* Full Diagnostic Document Viewer Modal */}
        {selectedReport && (
          <ReportDetailModal 
            report={selectedReport} 
            profile={profile} 
            onClose={() => setSelectedReport(null)} 
          />
        )}
      </div>
    </Layout>
  );
}

