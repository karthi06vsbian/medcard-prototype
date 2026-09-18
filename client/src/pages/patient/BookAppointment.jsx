import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Building, User } from 'lucide-react';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';

export default function BookAppointment() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [hospital, setHospital] = useState('City General Hospital');
  const [department, setDepartment] = useState('General Medicine');
  const [doctorId, setDoctorId] = useState('6');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/patient/appointments');
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    try {
      await api.post('/api/patient/appointments', {
        doctor_id: parseInt(doctorId, 10),
        hospital_name: hospital,
        department,
        slot_time: `${date} ${timeSlot}`,
        source: 'manual'
      });
      setSuccessMsg('Appointment booked successfully!');
      // Reset form
      setDate('');
      setTimeSlot('10:00 AM');
      fetchAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hospitals = ['City General Hospital', 'Apollo Hospital', 'AIIMS Delhi'];
  const departments = ['General Medicine', 'Cardiology', 'Orthopedics'];
  const doctors = [
    { id: '6', name: 'Dr. Anjali Gupta', dept: 'General Medicine' },
    { id: '7', name: 'Dr. Rajesh Kumar', dept: 'Cardiology' },
    { id: '8', name: 'Dr. Meera Nair', dept: 'Orthopedics' }
  ];
  const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

  // Filter doctors by selected department for UI
  const availableDoctors = doctors.filter(doc => doc.dept === department) || doctors;

  // Auto-select first available doctor when dept changes
  useEffect(() => {
    if (availableDoctors.length > 0 && !availableDoctors.find(d => d.id === doctorId)) {
      setDoctorId(availableDoctors[0].id);
    }
  }, [department]);

  return (
    <Layout role="patient">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center mb-6">
          <CalendarIcon className="h-8 w-8 text-primary-600 mr-3" />
          <h1 className="text-2xl font-bold text-darknavy">Appointments</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-darknavy mb-4 border-b border-slate-100 pb-2">Book New Appointment</h2>
              
              {successMsg && (
                <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-md text-sm font-medium border border-green-200">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hospital</label>
                  <select 
                    value={hospital} 
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-darknavy bg-white"
                  >
                    {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-darknavy bg-white"
                  >
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doctor</label>
                  <select 
                    value={doctorId} 
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-darknavy bg-white"
                  >
                    {availableDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-darknavy bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time Slot</label>
                  <select 
                    value={timeSlot} 
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-darknavy bg-white"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !date}
                  className="w-full mt-4 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition"
                >
                  {submitting ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            </div>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-darknavy mb-4">My Appointments</h2>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
                <CalendarIcon className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500">You don't have any appointments booked.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="space-y-2 mb-4 sm:mb-0">
                      <div className="flex items-center text-lg font-bold text-darknavy">
                        <User className="h-5 w-5 text-primary-600 mr-2" />
                        Dr. {apt.doctor_name}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                          {new Date(apt.slot_time).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1.5 text-slate-400" />
                          {new Date(apt.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1.5 text-slate-400" />
                          {apt.hospital_name || 'General Hospital'} - {apt.department || 'General'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={apt.status || 'Scheduled'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
