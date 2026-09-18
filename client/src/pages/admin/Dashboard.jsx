import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Stethoscope, Calendar, AlertTriangle, Building, Trash2, Plus, Shield, Store, Truck, QrCode, UserPlus, Camera, UploadCloud, X, Edit3, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../../components/Layout';
import api, { getPhotoUrl } from '../../lib/api';
import DigitalHealthCard from '../../components/DigitalHealthCard';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tableFileInputRef = useRef(null);

  const getTabFromPath = (pathname) => {
    if (pathname.includes('/admin/doctors')) return 'doctors';
    if (pathname.includes('/admin/pharmacies')) return 'pharmacies';
    if (pathname.includes('/admin/ambulances')) return 'ambulances';
    if (pathname.includes('/admin/patients')) return 'patients';
    return 'patients';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // Lists
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms & Modal States
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: '', email: '', password: '' });

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState(null);
  const [editingPatientForPhoto, setEditingPatientForPhoto] = useState(null);

  // Edit Patient Personal Information Modal State
  const [editingPatientData, setEditingPatientData] = useState(null);

  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    password: 'Password@123',
    dob: '',
    bloodGroup: 'O+',
    phone: '',
    allergies: '',
    photo: null
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const currentTab = getTabFromPath(location.pathname);
    setActiveTab(currentTab);
    fetchTabData(currentTab);
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes] = await Promise.all([
        api.get('/api/admin/stats').catch(() => ({ data: { totalPatients: 0, totalDoctors: 0, appointmentsToday: 0, sosAlertsToday: 0, activePharmacies: 0 } })),
        api.get('/api/admin/chart-data').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'patients') {
        const { data } = await api.get('/api/admin/patients').catch(() => ({ data: [] }));
        setPatients(data || []);
      } else if (tab === 'doctors') {
        const { data } = await api.get('/api/admin/doctors').catch(() => ({ data: [] }));
        setDoctors(data || []);
      } else if (tab === 'pharmacies') {
        const { data } = await api.get('/api/admin/pharmacies').catch(() => ({ data: [] }));
        setPharmacies(data || []);
      } else if (tab === 'ambulances') {
        const { data } = await api.get('/api/admin/ambulances').catch(() => ({ data: [] }));
        setAmbulances(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab}`);
  };

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/doctors', newDoctor);
      setShowAddDoctor(false);
      setNewDoctor({ name: '', email: '', password: '' });
      fetchTabData('doctors');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to add doctor');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPatient(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditPatientPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingPatientData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTablePhotoChange = async (e, patientId) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Photo = reader.result;
      try {
        await api.put(`/api/admin/patients/${patientId}/photo`, { photo: base64Photo });
        fetchTabData('patients');
        alert('Patient photo saved to local project files and updated!');
      } catch (err) {
        console.error(err);
        alert('Failed to update patient photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/admin/patients', newPatient);
      const createdPatient = res.data?.patient;
      setShowAddPatient(false);
      setNewPatient({
        name: '',
        email: '',
        password: 'Password@123',
        dob: '',
        bloodGroup: 'O+',
        phone: '',
        allergies: '',
        photo: null
      });
      fetchTabData('patients');
      fetchDashboardData();

      // Show generated Digital Health Card automatically
      if (createdPatient) {
        setSelectedPatientForCard(createdPatient);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create patient user ID');
    }
  };

  const handleSaveEditPatient = async (e) => {
    e.preventDefault();
    if (!editingPatientData) return;

    try {
      const patientId = editingPatientData.patient_id || editingPatientData.user_id || editingPatientData.id;
      await api.put(`/api/admin/patients/${patientId}`, editingPatientData);
      setEditingPatientData(null);
      fetchTabData('patients');
      alert('Patient personal information updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update patient details.');
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await api.delete(`/api/admin/doctors/${id}`);
        fetchTabData('doctors');
        fetchDashboardData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete doctor');
      }
    }
  };

  const handleDeleteUser = async (userId, tabName) => {
    if (window.confirm(`Are you sure you want to delete this ${tabName.slice(0, -1)}?`)) {
      try {
        await api.delete(`/api/admin/users/${userId}`);
        fetchTabData(tabName);
        fetchDashboardData();
      } catch (err) {
        console.error(err);
        alert('Failed to delete user');
      }
    }
  };

  return (
    <Layout role="admin">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hidden File Input for updating patient photo from table */}
        <input 
          type="file" 
          ref={tableFileInputRef}
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleTablePhotoChange(e, editingPatientForPhoto)}
        />

        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-3 rounded-xl text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-darknavy">Admin Dashboard</h2>
            <p className="text-sm text-slate-500">Manage platform users, stats, local photos, and patient records</p>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-primary-500 border-x border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Patients</p>
                  <p className="text-2xl font-bold text-darknavy mt-1">{stats.totalPatients}</p>
                </div>
                <Users className="w-6 h-6 text-primary-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-500 border-x border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Doctors</p>
                  <p className="text-2xl font-bold text-darknavy mt-1">{stats.totalDoctors}</p>
                </div>
                <Stethoscope className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-amber-500 border-x border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Appointments</p>
                  <p className="text-2xl font-bold text-darknavy mt-1">{stats.appointmentsToday}</p>
                </div>
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500 border-x border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium">SOS Alerts</p>
                  <p className="text-2xl font-bold text-darknavy mt-1">{stats.sosAlertsToday}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-secondary-500 border-x border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Pharmacies</p>
                  <p className="text-2xl font-bold text-darknavy mt-1">{stats.activePharmacies}</p>
                </div>
                <Building className="w-6 h-6 text-secondary-500" />
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-darknavy mb-6">Appointments Overview</h3>
          <div className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#F5F9FF' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="count" fill="#0B5ED7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No chart data available</div>
            )}
          </div>
        </div>

        {/* Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { key: 'patients', label: 'Patients', icon: Users },
              { key: 'doctors', label: 'Doctors', icon: Stethoscope },
              { key: 'pharmacies', label: 'Pharmacies', icon: Store },
              { key: 'ambulances', label: 'Ambulances', icon: Truck },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => handleTabChange(tab.key)}
                >
                  <TabIcon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-slate-500">Loading {activeTab}...</div>
            ) : (
              <>
                {/* Patients Tab Special UI: Add Patient Form */}
                {activeTab === 'patients' && (
                  <div className="mb-6">
                    <button 
                      onClick={() => setShowAddPatient(!showAddPatient)}
                      className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition shadow-sm font-semibold text-sm"
                    >
                      <UserPlus className="w-4 h-4" /> Create New Patient User ID (Generate QR Card)
                    </button>
                    
                    {showAddPatient && (
                      <form onSubmit={handleAddPatient} className="mt-4 p-6 bg-slate-50 border border-primary-200 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                          <h4 className="font-bold text-darknavy text-base flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary-600" /> Create Patient & Generate Unique Med ID
                          </h4>
                          <span className="text-xs text-primary-700 bg-primary-100 font-mono px-2 py-0.5 rounded font-bold">
                            Photos are saved locally to server/uploads/photos/
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                            <input required type="text" placeholder="e.g. Ramesh Kumar" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                            <input required type="email" placeholder="ramesh@gmail.com" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Password *</label>
                            <input required type="password" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.password} onChange={e => setNewPatient({...newPatient, password: e.target.value})} />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth (DOB) *</label>
                            <input required type="date" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group *</label>
                            <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy" value={newPatient.bloodGroup} onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})}>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                            <input type="text" placeholder="+91 9876543210" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Allergies / Special Medical Info</label>
                            <input type="text" placeholder="e.g. Penicillin Allergy, Asthma" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white" value={newPatient.allergies} onChange={e => setNewPatient({...newPatient, allergies: e.target.value})} />
                          </div>

                          {/* Upload Photo Dropzone / Input */}
                          <div className="md:col-span-3 bg-white p-4 rounded-xl border border-dashed border-primary-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {newPatient.photo ? (
                                <div className="relative">
                                  <img src={newPatient.photo} alt="Uploaded" className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500 shadow-md" />
                                  <button
                                    type="button"
                                    onClick={() => setNewPatient(prev => ({ ...prev, photo: null }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl border border-primary-100">
                                  <Camera className="w-6 h-6" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-sm text-darknavy">Upload Patient Photo</p>
                                <p className="text-xs text-slate-500">Saved locally in project files at server/uploads/photos/</p>
                              </div>
                            </div>

                            <label className="cursor-pointer bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
                              <UploadCloud className="w-4 h-4" />
                              {newPatient.photo ? 'Change Photo' : 'Select Photo File'}
                              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="submit" className="bg-primary-600 text-white px-6 py-2.5 rounded-xl hover:bg-primary-700 text-sm font-bold transition shadow-md">
                            Finish (Create & Generate QR Card)
                          </button>
                          <button type="button" onClick={() => setShowAddPatient(false)} className="bg-white text-slate-600 border border-slate-300 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Doctors Tab Special UI */}
                {activeTab === 'doctors' && (
                  <div className="mb-6">
                    <button 
                      onClick={() => setShowAddDoctor(!showAddDoctor)}
                      className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition shadow-sm font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Doctor
                    </button>
                    
                    {showAddDoctor && (
                      <form onSubmit={handleAddDoctor} className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-lg max-w-2xl">
                        <h4 className="font-semibold text-darknavy mb-4">New Doctor Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input required type="text" className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm text-darknavy bg-white" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input required type="email" className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm text-darknavy bg-white" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input required type="password" className="w-full p-2 border border-slate-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm text-darknavy bg-white" value={newDoctor.password} onChange={e => setNewDoctor({...newDoctor, password: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 text-sm font-medium">Save Doctor</button>
                          <button type="button" onClick={() => setShowAddDoctor(false)} className="bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded hover:bg-slate-50 text-sm">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Data Tables */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 font-medium">Patient Photo & Name</th>
                        <th className="py-3 px-4 font-medium">Email</th>
                        {activeTab === 'patients' && (
                          <>
                            <th className="py-3 px-4 font-medium">Unique Med ID</th>
                            <th className="py-3 px-4 font-medium">Blood Group</th>
                            <th className="py-3 px-4 font-medium">Phone</th>
                            <th className="py-3 px-4 font-medium">Digital ID Card</th>
                          </>
                        )}
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activeTab === 'patients' && patients.map(p => (
                        <tr key={p.user_id || p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-darknavy">
                            <div className="flex items-center gap-3">
                              <div className="relative group">
                                {p.photo ? (
                                  <img src={getPhotoUrl(p.photo)} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary-400" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center border-2 border-primary-300">
                                    {p.name?.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPatientForPhoto(p.patient_id || p.user_id || p.id);
                                    tableFileInputRef.current?.click();
                                  }}
                                  className="absolute -bottom-1 -right-1 bg-primary-600 text-white p-1 rounded-full text-[10px] hover:bg-primary-700 shadow-sm"
                                  title="Upload / Change Photo"
                                >
                                  <Camera className="w-3 h-3" />
                                </button>
                              </div>
                              <div>
                                <p className="font-bold text-darknavy">{p.name}</p>
                                <button
                                  type="button"
                                  onClick={() => setEditingPatientData({ ...p })}
                                  className="text-[11px] text-primary-600 hover:underline font-medium flex items-center gap-1 mt-0.5"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Information
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{p.email}</td>
                          <td className="py-3 px-4 text-primary-700 font-mono text-xs font-bold">{p.healthId || p.health_id || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600 font-semibold">{p.bloodGroup || p.blood_group || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600">{p.phone || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setSelectedPatientForCard(p)}
                              className="px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                            >
                              <QrCode className="w-3.5 h-3.5" /> View / Download ID Card
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => setEditingPatientData({ ...p })} 
                                className="text-primary-600 hover:text-primary-800 p-1.5 hover:bg-primary-50 rounded transition" 
                                title="Edit Patient Personal Information"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(p.user_id || p.id, 'patients')} 
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition" 
                                title="Delete Patient"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {activeTab === 'doctors' && doctors.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-darknavy">Dr. {d.name}</td>
                          <td className="py-3 px-4 text-slate-600">{d.email}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleDeleteDoctor(d.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition" title="Delete Doctor">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'pharmacies' && pharmacies.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-darknavy">{p.name}</td>
                          <td className="py-3 px-4 text-slate-600">{p.email}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleDeleteUser(p.id, 'pharmacies')} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition" title="Delete Pharmacy">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'ambulances' && ambulances.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-darknavy">{a.name}</td>
                          <td className="py-3 px-4 text-slate-600">{a.email}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleDeleteUser(a.id, 'ambulances')} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition" title="Delete Ambulance">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Empty states */}
                      {((activeTab === 'patients' && patients.length === 0) ||
                        (activeTab === 'doctors' && doctors.length === 0) ||
                        (activeTab === 'pharmacies' && pharmacies.length === 0) ||
                        (activeTab === 'ambulances' && ambulances.length === 0)) && (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-500 italic">
                            No {activeTab} found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Edit Patient Personal Information Modal */}
      {editingPatientData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-darknavy">Edit Patient Information</h3>
                  <p className="text-xs text-slate-500">Update personal details & photo</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingPatientData(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required type="text"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white"
                    value={editingPatientData.name || ''}
                    onChange={(e) => setEditingPatientData({...editingPatientData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    required type="email"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white"
                    value={editingPatientData.email || ''}
                    onChange={(e) => setEditingPatientData({...editingPatientData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white"
                    value={editingPatientData.dob || ''}
                    onChange={(e) => setEditingPatientData({...editingPatientData, dob: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white text-darknavy"
                    value={editingPatientData.bloodGroup || editingPatientData.blood_group || 'O+'}
                    onChange={(e) => setEditingPatientData({...editingPatientData, bloodGroup: e.target.value, blood_group: e.target.value})}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white"
                    value={editingPatientData.phone || ''}
                    onChange={(e) => setEditingPatientData({...editingPatientData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none text-darknavy bg-white"
                    value={editingPatientData.allergies || ''}
                    onChange={(e) => setEditingPatientData({...editingPatientData, allergies: e.target.value})}
                  />
                </div>
              </div>

              {/* Photo Change Input */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {editingPatientData.photo ? (
                    <img src={getPhotoUrl(editingPatientData.photo)} alt="Current" className="w-12 h-12 rounded-xl object-cover border-2 border-primary-500" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                      {editingPatientData.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-darknavy">Patient Photo</p>
                    <p className="text-[11px] text-slate-500">Saved to server/uploads/photos/</p>
                  </div>
                </div>

                <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-primary-600" /> Change Photo
                  <input type="file" accept="image/*" onChange={handleEditPatientPhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPatientData(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Health ID Card Modal */}
      {selectedPatientForCard && (
        <DigitalHealthCard 
          patient={selectedPatientForCard}
          onClose={() => setSelectedPatientForCard(null)}
        />
      )}
    </Layout>
  );
};

export default AdminDashboard;
