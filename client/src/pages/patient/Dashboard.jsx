import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, FileText, Calendar, MessageSquare, Pill, MapPin, Activity, Truck, Shield, ArrowRight, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api, { getPhotoUrl } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import Modal from '../../components/Modal';
import DigitalHealthCard from '../../components/DigitalHealthCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [insuranceData, setInsuranceData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // SOS State
  const [showSOS, setShowSOS] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [sosLocation, setSosLocation] = useState('Current GPS Location - 28.6139° N, 77.2090° E');
  const [sosStatus, setSosStatus] = useState('idle'); // idle, sending, success

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, insuranceRes] = await Promise.all([
          api.get('/api/patient/profile'),
          api.get('/api/patient/insurance-agent').catch(() => ({ data: null }))
        ]);
        setProfile(profileRes.data);
        if (insuranceRes.data) setInsuranceData(insuranceRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSOS = async () => {
    setSosStatus('sending');
    try {
      await api.post('/api/patient/sos', { location_text: sosLocation });
      setSosStatus('success');
    } catch (error) {
      console.error('Error sending SOS:', error);
      setSosStatus('idle');
      alert('Failed to send SOS. Please try again or call emergency services directly.');
    }
  };

  const closeSOS = () => {
    setShowSOS(false);
    setTimeout(() => setSosStatus('idle'), 300);
  };

  return (
    <Layout role="patient">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
        
        {/* Health ID Card */}
        {(() => {
          const healthId = profile?.health_id || user?.health_id || (user?.id ? `SWID-2024-${user.id.toString().padStart(4, '0')}` : 'SWID-2024-0001');
          return (
            <div className="bg-[#071322] border border-cyan-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <QrCode size={180} />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-6">
                <div className="flex items-start gap-4">
                  {profile?.photo ? (
                    <img
                      src={getPhotoUrl(profile.photo)}
                      alt="Profile"
                      className="w-20 h-24 rounded-2xl object-cover border-2 border-cyan-400 shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-24 rounded-2xl bg-cyan-950 border-2 border-cyan-400/40 flex flex-col items-center justify-center text-cyan-300 flex-shrink-0">
                      <QrCode size={24} className="opacity-60" />
                      <span className="text-[10px] mt-1 font-mono opacity-80">Photo</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-cyan-400 text-xs font-mono tracking-wider uppercase">BUILD IQ • MEDICARD</p>
                      <button
                        onClick={() => setShowCardModal(true)}
                        className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-[11px] px-2.5 py-0.5 rounded-full border border-cyan-500/40 transition flex items-center gap-1 font-mono shadow-sm"
                        title="View & Download Official Digital Card"
                      >
                        <ExternalLink size={11} /> View Full Card
                      </button>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-1.5 text-white">{profile?.name || user?.name || 'C. Joseph Vijay'}</h2>
                    <div className="inline-block bg-[#08242f] border border-teal-500/40 text-cyan-300 rounded-lg px-3 py-1 text-sm sm:text-base tracking-widest font-mono mb-3">
                      {healthId}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:text-sm">
                      <div>
                        <span className="text-slate-400">Blood Group:</span>{' '}
                        <span className="font-semibold text-rose-400">{profile?.blood_group || 'B+'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Body Type:</span>{' '}
                        <span className="font-semibold text-teal-300">{profile?.body_type?.split('(')[0]?.trim() || 'Mesomorph'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">BMI / Vitals:</span>{' '}
                        <span className="font-semibold text-slate-200">{profile?.bmi || '23.1'} ({profile?.weight || '75 kg'})</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Blood Pressure:</span>{' '}
                        <span className="font-semibold text-slate-200">{profile?.blood_pressure || '120/80 mmHg'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">Allergies:</span>{' '}
                        <span className="font-semibold text-emerald-300">{profile?.allergies || 'None Reported'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => setShowCardModal(true)}
                  className="mt-2 sm:mt-0 flex flex-col items-center bg-white p-3 rounded-2xl shadow-lg border-2 border-cyan-400 cursor-pointer hover:scale-105 transition-all group"
                  title="Click to view & download official Digital Health ID"
                >
                  <div className="w-32 h-32 bg-white rounded-xl p-1.5 flex items-center justify-center">
                    <QRCodeSVG
                      value={healthId}
                      size={116}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 mt-1.5 flex items-center gap-1 group-hover:text-teal-700 transition">
                    <QrCode size={13} /> {healthId}
                  </span>
                  <span className="text-[10px] text-cyan-700 font-mono font-bold">SCAN TO VIEW</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* AI Medical Insurance Agent Banner for Repeated Symptoms */}
        {insuranceData?.hasRecurringSymptoms && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white flex-shrink-0 mt-1">
                  <Shield size={32} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-black/20 text-amber-100 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 border border-white/20">
                    <span>🛡️ AI Insurance Agent Alert</span>
                    <span>• Recurring Symptoms Detected</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Recommendation: Secure Medical Insurance Policy
                  </h3>
                  <p className="text-amber-100 text-sm mt-1 max-w-2xl leading-relaxed">
                    Our AI health monitor detected recurring symptom logs on your profile (such as <strong>heavy headaches, chest pain, or chronic discomfort</strong>). Repeated symptoms can require specialized diagnostic scans or unexpected hospital admissions. Protect your family with curated health insurance.
                  </p>
                  {insuranceData?.recurringList?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-amber-100 font-semibold self-center">Recurring Logs:</span>
                      {insuranceData.recurringList.map((item, i) => (
                        <span key={i} className="text-xs font-bold bg-white/20 backdrop-blur-xs text-white px-2.5 py-1 rounded-md border border-white/20">
                          ⚠️ {item.symptom} {item.count > 1 ? `(${item.count}x)` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0 w-full md:w-auto">
                <Link
                  to="/patient/insurance"
                  className="inline-flex items-center justify-center gap-2 bg-white text-red-700 hover:bg-amber-50 font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-105 w-full md:w-auto text-sm"
                >
                  Explore Insurance Plans
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-lg font-semibold text-[#172B4D] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link to="/patient/history" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary-300 transition group flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h4 className="font-medium text-[#172B4D] text-sm">Medical History</h4>
              <p className="text-xs text-[#64748B] mt-1">Past records & labs</p>
            </Link>
            
            <Link to="/patient/appointments" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-secondary-300 transition group flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-secondary-50 text-secondary-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <h4 className="font-medium text-[#172B4D] text-sm">Book Appointment</h4>
              <p className="text-xs text-[#64748B] mt-1">Schedule a doctor visit</p>
            </Link>

            <Link to="/patient/chatbot" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-accent-300 transition group flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare size={24} />
              </div>
              <h4 className="font-medium text-[#172B4D] text-sm">AI Chatbot</h4>
              <p className="text-xs text-[#64748B] mt-1">Check symptoms & triage</p>
            </Link>

            <Link to="/patient/orders" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary-300 transition group flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Pill size={24} />
              </div>
              <h4 className="font-medium text-[#172B4D] text-sm">Medicine Orders</h4>
              <p className="text-xs text-[#64748B] mt-1">Track prescriptions</p>
            </Link>

            <Link to="/patient/insurance" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-amber-300 transition group flex flex-col items-center text-center relative">
              <div className="h-12 w-12 bg-amber-50 text-[#F59E0B] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <h4 className="font-medium text-[#172B4D] text-sm">Medical Insurance</h4>
              <p className="text-xs text-[#64748B] mt-1">AI Agent & Policies</p>
            </Link>
          </div>
        </div>

        {/* Floating SOS Button (Also at bottom of dashboard for visibility) */}
        <div className="mt-8 bg-red-50 rounded-xl p-6 border border-red-100 flex flex-col sm:flex-row items-center justify-between shadow-sm">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="bg-red-100 p-3 rounded-full mr-4 text-red-600">
              <Activity size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">Emergency Assistance</h3>
              <p className="text-sm text-red-600">Press the SOS button to instantly alert nearest hospitals and ambulances.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSOS(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 w-full sm:w-auto"
          >
            SOS EMERGENCY
          </button>
        </div>

        {/* SOS Modal */}
        <Modal isOpen={showSOS} onClose={closeSOS} title="🚨 Emergency SOS Alert">
          <div className="p-2">
            {sosStatus === 'idle' && (
              <div className="space-y-4">
                <p className="text-gray-700 text-sm">
                  This will immediately send your medical profile and location to the nearest emergency responders.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Location</label>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 absolute ml-3" />
                    <input
                      type="text"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2.5 border"
                      value={sosLocation}
                      onChange={(e) => setSosLocation(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSOS}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  SEND SOS ALERT
                </button>
              </div>
            )}
            
            {sosStatus === 'sending' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900">Broadcasting emergency signal...</p>
              </div>
            )}

            {sosStatus === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">✅ Alert sent to nearest ambulance!</h3>
                <div className="bg-gray-100 h-40 rounded-lg flex items-center justify-center relative overflow-hidden border border-gray-200">
                  {/* Fake map */}
                  <div className="absolute inset-0 bg-blue-50 opacity-50" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                  <div className="relative flex flex-col items-center animate-pulse">
                    <Truck className="h-10 w-10 text-red-600" />
                    <span className="text-xs font-semibold bg-white px-2 py-1 rounded shadow mt-2">Ambulance dispatched</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-teal-700">Estimated arrival: 8 minutes</p>
                <button
                  onClick={closeSOS}
                  className="mt-4 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Modal>

        {/* Digital Health ID Card Modal */}
        {showCardModal && (
          <DigitalHealthCard
            patient={{
              name: profile?.name || user?.name,
              healthId: profile?.health_id || user?.health_id || (user?.id ? `SWID-2024-${user.id.toString().padStart(4, '0')}` : 'SWID-2024-0001'),
              bloodGroup: profile?.blood_group,
              dob: profile?.dob,
              phone: profile?.phone,
              photo: profile?.photo,
              bodyType: profile?.body_type,
              allergies: profile?.allergies,
              user_id: profile?.user_id || user?.id,
            }}
            onClose={() => setShowCardModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}
