import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, FileText, Pill, Calendar, Clock, Building, Activity, QrCode, 
  CheckCircle2, ShieldAlert, Sparkles, Send, Bot, AlertCircle, RefreshCw, 
  ChevronRight, ShieldCheck, Stethoscope, History, Check, ArrowUpRight,
  TrendingUp, Eye
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import api, { getPhotoUrl } from '../../lib/api';
import QRScannerModal from '../../components/QRScannerModal';
import MedCardChatbot from '../../components/MedCardChatbot';

const DOCTOR_QUICK_ACTIONS = [
  { label: '🌡️ Review previous fever history', query: 'Review previous fever history' },
  { label: '💊 Review previous treatments', query: 'Review previous treatments' },
  { label: '🧪 Review medical reports', query: 'Review medical reports' },
  { label: '📋 Summarize previous visits', query: 'Summarize previous visits' },
  { label: '📈 Review recovery history', query: 'Review recovery history' },
  { label: '📝 Add new checkup', action: 'checkup' },
  { label: '🩺 Add treatment record', action: 'treatment' }
];

const DoctorDashboard = () => {
  const [searchId, setSearchId] = useState('SWID-2024-0001');
  const [patient, setPatient] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  // Forms & Modal states
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [accessConfirmedMsg, setAccessConfirmedMsg] = useState('');
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // AI Assistant States
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState([]);
  const aiChatEndRef = useRef(null);

  // Structured Treatment Form State
  const [treatmentForm, setTreatmentForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    symptoms: '',
    clinical_notes: '',
    diagnosis: '',
    treatment: '',
    medication: '',
    dosage: '',
    frequency: 'TID (3 times daily)',
    duration: '3 days',
    tests: '',
    follow_up_date: '',
    recovery_status: 'Improving',
    doctor_notes: ''
  });

  // Fast Prescription Form State
  const [prescriptionData, setPrescriptionData] = useState({ 
    medicine_name: '', 
    dosage: '', 
    quantity: 1 
  });

  useEffect(() => {
    fetchAppointments();
    performSearch('SWID-2024-0001');
  }, []);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiResponses, aiLoading]);

  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/api/doctor/appointments');
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const performSearch = async (idToSearch) => {
    if (!idToSearch) return;
    setSearchLoading(true);
    setSearchError('');
    setActionMessage('');
    try {
      const { data } = await api.get(`/api/doctor/search?healthId=${idToSearch}`);
      setPatient(data);
      setAccessConfirmedMsg(`✓ Doctor Access Confirmed for ${data.name} (${data.healthId})`);
      
      // Auto-initialize AI Assistant greeting for this patient
      setAiResponses([
        {
          sender: 'ai',
          text: `How can I assist with **${data.name}**'s current visit? I have indexed their complete longitudinal history, recovery records, past medications, and lab diagnostics.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setSearchError('No patient found for this Med ID QR Code.');
      setPatient(null);
      setAccessConfirmedMsg('');
      setAiResponses([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowScannerModal(false);
    setShowTreatmentModal(false);
    setShowPrescriptionModal(false);
    performSearch(searchId);
  };

  const handleQRScanSuccess = (scannedMedId) => {
    setShowScannerModal(false);
    setSearchId(scannedMedId);
    performSearch(scannedMedId);
  };

  // AI Assistant Query Handler
  const handleAskAI = async (queryText) => {
    const q = queryText || aiQuery;
    if (!q.trim() || !patient?.patient_id) return;

    setAiResponses(prev => [
      ...prev,
      { sender: 'doctor', text: q, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setAiQuery('');
    setAiLoading(true);

    try {
      const { data } = await api.post('/api/doctor/ai-assistant', {
        patient_id: patient.patient_id,
        query: q
      });

      setAiResponses(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply,
          sections: data.sections,
          quickActions: data.quickActions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setAiResponses(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Unable to process clinical analysis query at this time. Please verify patient records manually.',
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Structured Treatment Submission
  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    if (!patient?.patient_id) return;

    try {
      await api.post('/api/doctor/treatment', {
        patient_id: patient.patient_id,
        ...treatmentForm
      });
      setActionMessage('✓ Clinical treatment record created and immutable entry registered.');
      setShowTreatmentModal(false);
      // Reset form
      setTreatmentForm({
        visit_date: new Date().toISOString().split('T')[0],
        symptoms: '',
        clinical_notes: '',
        diagnosis: '',
        treatment: '',
        medication: '',
        dosage: '',
        frequency: 'TID (3 times daily)',
        duration: '3 days',
        tests: '',
        follow_up_date: '',
        recovery_status: 'Improving',
        doctor_notes: ''
      });
      // Re-fetch patient history so updated timeline appears immediately
      performSearch(patient.healthId);
    } catch (err) {
      setActionMessage('Error saving clinical treatment record.');
    }
  };

  // Direct Prescription Submission
  const handlePrescribe = async (e) => {
    e.preventDefault();
    if (!patient?.patient_id) return;
    try {
      await api.post('/api/doctor/prescribe', { patient_id: patient.patient_id, ...prescriptionData });
      setActionMessage('✓ Prescription issued and queued for pharmacy fulfillment.');
      setPrescriptionData({ medicine_name: '', dosage: '', quantity: 1 });
      setShowPrescriptionModal(false);
      performSearch(patient.healthId);
    } catch (err) {
      setActionMessage('Error prescribing medicine.');
    }
  };

  const getRecoveryBadgeColor = (status) => {
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
    <Layout role="doctor">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Search & Scan Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Primary SCAN QR Button */}
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base animate-bounce-short"
            >
              <QrCode className="w-5 h-5" /> Scan Patient QR Code
            </button>

            {/* Manual Health ID Search Input */}
            <form onSubmit={handleSearch} className="flex-1 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search patient by Med ID (e.g. SWID-2024-0001 or MID-19980512-849201)"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono text-darknavy bg-white"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={searchLoading}
                className="bg-primary-600 text-white px-5 py-3 rounded-xl hover:bg-primary-700 transition flex items-center gap-2 font-medium text-sm shadow-sm"
              >
                {searchLoading ? 'Fetching...' : <><Search className="w-4 h-4" /> Fetch Patient</>}
              </button>
            </form>
          </div>

          {/* Quick Select Patient Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-semibold">Demo Patients:</span>
            {[
              { id: 'SWID-2024-0001', name: 'C. Joseph Vijay (Fever Case Study)' },
              { id: 'SWID-2024-0002', name: 'Siva Karthikeyan' },
              { id: 'SWID-2024-0003', name: 'Sanjay Ram' },
              { id: 'SWID-2024-0004', name: 'Surya Prakash' },
              { id: 'SWID-2024-0005', name: 'Karthi Anbuselvan' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSearchId(p.id);
                  performSearch(p.id);
                }}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${
                  patient?.healthId === p.id
                    ? 'bg-primary-600 text-white shadow-sm font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-700 border border-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {searchError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Doctor Access Confirmation Banner */}
        {accessConfirmedMsg && patient && (
          <div className="bg-green-50 border border-green-200 text-green-900 p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>{accessConfirmedMsg}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-primary-100 text-primary-800 text-[11px] px-2.5 py-0.5 rounded-full uppercase font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-600" /> Verified Doctor
              </span>
              <span className="bg-green-200 text-green-800 text-[11px] px-2.5 py-0.5 rounded-full uppercase font-mono font-bold">
                Medical Access Granted
              </span>
            </div>
          </div>
        )}

        {/* Patient Record Main View */}
        {patient && (
          <div className="space-y-6">
            
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-primary-50/80 via-slate-50 to-secondary-50/50">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    {patient.photo ? (
                      <img src={getPhotoUrl(patient.photo)} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500 shadow-md" />
                    ) : (
                      <div className="bg-primary-100 p-4 rounded-2xl border border-primary-200">
                        <User className="w-8 h-8 text-primary-700" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-darknavy">{patient.name}</h2>
                        <span className="text-[11px] bg-secondary-100 text-secondary-800 border border-secondary-300 px-2 py-0.5 rounded-full font-bold">
                          {patient.body_type || 'Mesomorph'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-primary-700 font-mono font-bold text-xs bg-primary-100/70 border border-primary-200 px-2 py-0.5 rounded-md">
                          {patient.healthId}
                        </p>
                        <span className="text-xs text-slate-500">Phone: {patient.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vitals Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
                    <div>
                      <span className="text-slate-400 block font-semibold">Blood Group</span>
                      <span className="font-bold text-red-600 text-sm">{patient.bloodGroup || 'O+'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Age / Gender</span>
                      <span className="font-bold text-slate-800">{calculateAge(patient.dob)} yrs / Male</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Height & Weight</span>
                      <span className="font-bold text-slate-800">{patient.height || '180 cm'} • {patient.weight || '75 kg'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Known Allergies</span>
                      <span className="font-bold text-amber-700 truncate">{patient.allergies || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200/60">
                  <div className="flex flex-wrap gap-2.5">
                    <button 
                      onClick={() => setShowTreatmentModal(true)}
                      className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 font-bold text-xs sm:text-sm transition shadow-sm"
                    >
                      <Stethoscope className="w-4 h-4" /> + Add Treatment & Checkup
                    </button>
                    <button 
                      onClick={() => setShowPrescriptionModal(true)}
                      className="flex items-center gap-2 bg-secondary-600 text-white px-5 py-2.5 rounded-xl hover:bg-secondary-700 font-bold text-xs sm:text-sm transition shadow-sm"
                    >
                      <Pill className="w-4 h-4" /> + Fast Prescribe Medicine
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    <span>Active Session: Dr. Authorized Physician</span>
                  </div>
                </div>

                {actionMessage && (
                  <div className="mt-3 p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{actionMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MEDCARD GENERATIVE AI CLINICAL CHATBOT
               ═══════════════════════════════════════════════════════ */}
            <MedCardChatbot 
              patient={patient} 
              role="doctor" 
              onOpenCheckup={() => setShowTreatmentModal(true)} 
            />

            {/* ═══════════════════════════════════════════════════════
                LONGITUDINAL RECOVERY TIMELINE
               ═══════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-darknavy">Longitudinal Recovery Timeline</h3>
                    <p className="text-xs text-slate-500">Track illness trajectory from initial consultation to recovery confirmation</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Total Stages:</span>
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold">
                    {patient.recoveryTimeline?.length || 0} Visits Recorded
                  </span>
                </div>
              </div>

              {patient.recoveryTimeline && patient.recoveryTimeline.length > 0 ? (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
                  {patient.recoveryTimeline.map((item, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-teal-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                      </div>

                      {/* Card */}
                      <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-darknavy text-sm">{item.stage}</span>
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${getRecoveryBadgeColor(item.status)}`}>
                              ● {item.status}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-500 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {item.date}
                          </span>
                        </div>

                        {/* Symptoms & Diagnosis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Reported Symptoms:</span>
                            <span className="font-medium text-slate-800">{item.symptoms}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Doctor Diagnosis:</span>
                            <span className="font-bold text-primary-700">{item.diagnosis}</span>
                          </div>
                        </div>

                        {/* Treatment & Prescribed Medication */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                          <div>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase block">Treatment & Clinical Notes:</span>
                            <p className="text-slate-700 leading-relaxed">{item.treatment || item.notes}</p>
                          </div>
                          {item.medication && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-teal-800 font-medium">
                              <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>Medication: <strong>{item.medication}</strong> {item.dosage ? `(${item.dosage})` : ''}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> Dr. {item.doctor}</span>
                          <span className="italic">{item.outcome}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">No longitudinal recovery timeline records recorded yet.</p>
              )}
            </div>

            {/* Entire Medical History & Diagnostic Scans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Previous Consultations & Medical History */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h3 className="text-base font-bold text-darknavy flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity className="w-5 h-5 text-primary-600" /> Complete Clinical Records
                </h3>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {patient.history && patient.history.length > 0 ? patient.history.map((record, i) => (
                    <div key={i} className="p-4 border border-slate-200 bg-white shadow-sm rounded-xl space-y-2 hover:border-primary-300 transition">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-darknavy text-sm">{record.diagnosis}</p>
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3"/> {record.date}
                        </span>
                      </div>
                      
                      {record.symptoms && (
                        <p className="text-xs text-slate-600"><span className="font-semibold text-slate-700">Symptoms:</span> {record.symptoms}</p>
                      )}
                      
                      <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-slate-700">Notes:</span> {record.notes}</p>
                      
                      {record.treatment && (
                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-700">
                          <span className="font-semibold text-primary-700">Treatment: </span>{record.treatment}
                        </div>
                      )}

                      <div className="text-[11px] text-primary-700 font-semibold border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1"><User className="w-3 h-3"/> Dr. {record.doctor || 'Attending Physician'}</span>
                        <span className="text-slate-400">Category: {record.category || 'General'}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 italic text-xs py-4 text-center">No previous medical records found.</p>
                  )}
                </div>
              </div>

              {/* Prescriptions & Diagnostic Reports */}
              <div className="space-y-6">
                
                {/* Past Prescriptions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h3 className="text-base font-bold text-darknavy flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Pill className="w-5 h-5 text-secondary-600" /> Prescriptions History
                  </h3>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {patient.prescriptions && patient.prescriptions.length > 0 ? patient.prescriptions.map((rx, i) => (
                      <div key={i} className="p-3.5 border border-slate-200 bg-white shadow-sm rounded-xl space-y-1 hover:border-secondary-300 transition">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-darknavy text-sm">{rx.medicine_name}</p>
                          <span className="text-[11px] font-bold text-secondary-700 bg-secondary-50 border border-secondary-200 px-2 py-0.5 rounded-full">
                            Qty: {rx.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{rx.dosage}</p>
                        <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1 flex items-center justify-between">
                          <span className="flex items-center gap-1"><User className="w-3 h-3"/> Dr. {rx.doctor || 'Attending Physician'}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {rx.date}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 italic text-xs py-4 text-center">No past prescriptions found.</p>
                    )}
                  </div>
                </div>

                {/* Diagnostic Reports & Imaging */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h3 className="text-base font-bold text-darknavy flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText className="w-5 h-5 text-cyan-600" /> Diagnostic Lab & Imaging Reports
                  </h3>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {patient.reports && patient.reports.length > 0 ? patient.reports.map((rep, i) => (
                      <div key={i} className="p-3.5 border border-slate-200 bg-white shadow-sm rounded-xl space-y-1 hover:border-cyan-300 transition">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-darknavy text-sm">{rep.report_name}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                            {rep.report_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{rep.notes || rep.lab_name}</p>
                        <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1 flex items-center justify-between">
                          <span>{rep.lab_name || 'Diagnostic Lab'}</span>
                          <span>{rep.report_date}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 italic text-xs py-4 text-center">No diagnostic reports found.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Scheduled Appointments Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 text-darknavy flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" /> Today's Scheduled Consultations
          </h3>
          {appointmentsLoading ? (
            <div className="flex justify-center p-8"><p className="text-slate-500 text-sm">Loading scheduled appointments...</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 font-semibold rounded-tl-xl">Patient Name</th>
                    <th className="py-3 px-4 font-semibold">Health ID</th>
                    <th className="py-3 px-4 font-semibold">Hospital</th>
                    <th className="py-3 px-4 font-semibold">Slot Time</th>
                    <th className="py-3 px-4 font-semibold rounded-tr-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length > 0 ? appointments.map((apt, i) => (
                    <tr key={i} className="text-sm hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 text-darknavy font-bold">{apt.patientName}</td>
                      <td className="py-3.5 px-4 text-primary-700 font-mono text-xs font-bold">{apt.healthId}</td>
                      <td className="py-3.5 px-4 text-slate-600"><span className="flex items-center gap-1"><Building className="w-4 h-4 text-slate-400"/>{apt.hospital}</span></td>
                      <td className="py-3.5 px-4 text-slate-600"><span className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-400"/>{apt.time}</span></td>
                      <td className="py-3.5 px-4"><StatusBadge status={apt.status} /></td>
                    </tr>
                  )) : <tr><td colSpan="5" className="py-8 text-center text-slate-500 italic text-sm">No appointments scheduled for today.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════
          STRUCTURED TREATMENT & CHECKUP MODAL
         ═══════════════════════════════════════════════════════ */}
      {showTreatmentModal && patient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs" onClick={() => setShowTreatmentModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-700 to-secondary-700 text-white p-5 rounded-t-2xl flex items-center justify-between sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-6 h-6 text-cyan-300" />
                <div>
                  <h3 className="font-extrabold text-lg">Record Structured Clinical Treatment</h3>
                  <p className="text-xs text-blue-100">Patient: {patient.name} ({patient.healthId})</p>
                </div>
              </div>
              <button onClick={() => setShowTreatmentModal(false)} className="text-white hover:bg-white/20 p-1.5 rounded-lg transition">✕</button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveTreatment} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visit Date *</label>
                  <input 
                    required type="date"
                    value={treatmentForm.visit_date}
                    onChange={e => setTreatmentForm({ ...treatmentForm, visit_date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recovery Status *</label>
                  <select 
                    value={treatmentForm.recovery_status}
                    onChange={e => setTreatmentForm({ ...treatmentForm, recovery_status: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy font-semibold"
                  >
                    <option value="Improving">Improving (Positive Response)</option>
                    <option value="Recovered">Recovered (Afebrile / Full Recovery)</option>
                    <option value="Ongoing">Ongoing (Active Symptoms)</option>
                    <option value="Referred">Referred to Specialist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Symptoms *</label>
                <input 
                  required type="text"
                  placeholder="e.g. Fever 101.2°F, mild headache, malaise since 2 days"
                  value={treatmentForm.symptoms}
                  onChange={e => setTreatmentForm({ ...treatmentForm, symptoms: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor-Entered Diagnosis *</label>
                <input 
                  required type="text"
                  placeholder="e.g. Acute Viral Fever & Mild Dehydration"
                  value={treatmentForm.diagnosis}
                  onChange={e => setTreatmentForm({ ...treatmentForm, diagnosis: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes & Findings</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Chest clear, throat mildly congested, hydration adequate"
                  value={treatmentForm.clinical_notes}
                  onChange={e => setTreatmentForm({ ...treatmentForm, clinical_notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prescribed Treatment / Plan *</label>
                <textarea 
                  required rows="2"
                  placeholder="e.g. Symptomatic antipyretic therapy, oral hydration 3L/day, 3 days rest"
                  value={treatmentForm.treatment}
                  onChange={e => setTreatmentForm({ ...treatmentForm, treatment: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy"
                />
              </div>

              {/* Medication Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-secondary-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-secondary-600" /> Prescribed Medication (Dispatched to Pharmacy)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Medicine Name</label>
                    <input 
                      type="text" placeholder="Paracetamol 650mg"
                      value={treatmentForm.medication}
                      onChange={e => setTreatmentForm({ ...treatmentForm, medication: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-darknavy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dosage</label>
                    <input 
                      type="text" placeholder="1 tablet after meals"
                      value={treatmentForm.dosage}
                      onChange={e => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-darknavy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Frequency & Duration</label>
                    <input 
                      type="text" placeholder="TID x 3 days"
                      value={treatmentForm.duration}
                      onChange={e => setTreatmentForm({ ...treatmentForm, duration: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-darknavy"
                    />
                  </div>
                </div>
              </div>

              {/* Follow-up & Recommended Tests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Lab Tests</label>
                  <input 
                    type="text" placeholder="e.g. CBC, Platelet Count, Dengue NS1"
                    value={treatmentForm.tests}
                    onChange={e => setTreatmentForm({ ...treatmentForm, tests: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-darknavy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Follow-up Date</label>
                  <input 
                    type="date"
                    value={treatmentForm.follow_up_date}
                    onChange={e => setTreatmentForm({ ...treatmentForm, follow_up_date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-darknavy"
                  />
                </div>
              </div>

              {/* Doctor Private Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physician Private Clinical Notes</label>
                <input 
                  type="text" placeholder="e.g. Advised immediate return if temperature exceeds 103F or rash appears"
                  value={treatmentForm.doctor_notes}
                  onChange={e => setTreatmentForm({ ...treatmentForm, doctor_notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-darknavy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowTreatmentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  Save & Commit Treatment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FAST PRESCRIBE MODAL
         ═══════════════════════════════════════════════════════ */}
      {showPrescriptionModal && patient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowPrescriptionModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-secondary-700 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-cyan-300" />
                <h3 className="font-extrabold text-base">Prescribe Medicine</h3>
              </div>
              <button onClick={() => setShowPrescriptionModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">✕</button>
            </div>

            <form onSubmit={handlePrescribe} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Medicine Name *</label>
                <input 
                  required type="text" placeholder="e.g. Paracetamol 650mg, Azithromycin 500mg"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary-500 outline-none text-sm text-darknavy bg-white"
                  value={prescriptionData.medicine_name} onChange={e => setPrescriptionData({...prescriptionData, medicine_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dosage Instructions *</label>
                <input 
                  required type="text" placeholder="e.g. 1 tablet after meals twice daily for 3 days"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary-500 outline-none text-sm text-darknavy bg-white"
                  value={prescriptionData.dosage} onChange={e => setPrescriptionData({...prescriptionData, dosage: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Units) *</label>
                <input 
                  required type="number" min="1"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary-500 outline-none text-sm text-darknavy bg-white"
                  value={prescriptionData.quantity} onChange={e => setPrescriptionData({...prescriptionData, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPrescriptionModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-secondary-600 hover:bg-secondary-700 text-white font-bold rounded-xl text-sm shadow-md transition">
                  Issue Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      {showScannerModal && (
        <QRScannerModal 
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </Layout>
  );
};

export default DoctorDashboard;
