import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Building, User, Phone, CheckCircle, Filter } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/api';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/api/doctor/appointments');
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/api/doctor/appointments/${id}/status`, { status: newStatus });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const counts = {
    all: appointments.length,
    Scheduled: appointments.filter(a => a.status === 'Scheduled').length,
    Completed: appointments.filter(a => a.status === 'Completed').length,
  };

  return (
    <Layout role="doctor">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2.5 rounded-xl border border-primary-100">
            <Calendar className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-darknavy">My Appointments</h1>
            <p className="text-sm text-slate-500">Manage your patient appointments</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', count: counts.all, colorClass: 'bg-primary-50 border-primary-300 ring-2 ring-primary-200', filterVal: 'all' },
            { label: 'Scheduled', count: counts.Scheduled, colorClass: 'bg-blue-50 border-blue-300 ring-2 ring-blue-200', filterVal: 'Scheduled' },
            { label: 'Completed', count: counts.Completed, colorClass: 'bg-green-50 border-green-300 ring-2 ring-green-200', filterVal: 'Completed' },
          ].map(s => (
            <button
              key={s.filterVal}
              onClick={() => setFilter(s.filterVal)}
              className={`p-4 rounded-xl border transition text-left ${
                filter === s.filterVal
                  ? s.colorClass
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-darknavy">{s.count}</p>
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-darknavy">No appointments found</h3>
            <p className="text-slate-500 mt-1">
              {filter !== 'all' ? 'Try a different filter.' : 'No appointments are currently booked with you.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((apt) => (
              <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-50 p-3 rounded-full flex-shrink-0 border border-primary-100">
                      <User className="w-5 h-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-darknavy">{apt.patientName}</h3>
                      <p className="text-xs text-primary-600 font-mono font-medium">{apt.healthId}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(apt.time).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-slate-400" />
                          {apt.time.includes(':') ? apt.time.split(' ').slice(1).join(' ') || new Date(apt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building size={14} className="text-slate-400" />
                          {apt.hospital} — {apt.department}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={apt.status} />
                    {apt.status === 'Scheduled' && (
                      <button
                        onClick={() => updateStatus(apt.id, 'Completed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition shadow-xs"
                      >
                        <CheckCircle size={14} />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorAppointments;
