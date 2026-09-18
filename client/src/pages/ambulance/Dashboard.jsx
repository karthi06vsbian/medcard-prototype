import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Phone, Clock, Siren, History, CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/api';

const AmbulanceDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [alertsRes, historyRes] = await Promise.all([
        api.get('/api/ambulance/alerts').catch(() => ({ data: [] })),
        api.get('/api/ambulance/history').catch(() => ({ data: [] }))
      ]);
      setAlerts(alertsRes.data || []);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNextAction = (status) => {
    switch(status) {
      case 'Alert Sent': return { text: 'Mark Dispatched', nextStatus: 'Dispatched', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'Dispatched': return { text: 'Reached Patient', nextStatus: 'Reached Patient', color: 'bg-yellow-600 hover:bg-yellow-700' };
      case 'Reached Patient': return { text: 'En Route to Hospital', nextStatus: 'En Route to Hospital', color: 'bg-purple-600 hover:bg-purple-700' };
      case 'En Route to Hospital': return { text: 'Mark Completed', nextStatus: 'Completed', color: 'bg-green-600 hover:bg-green-700' };
      default: return null;
    }
  };

  const updateStatus = async (id, nextStatus) => {
    try {
      await api.put(`/api/ambulance/alerts/${id}/status`, { status: nextStatus });
      if (nextStatus === 'Completed') {
        const completedAlert = alerts.find(a => a.id === id);
        if (completedAlert) {
          completedAlert.status = 'Completed';
          setHistory([completedAlert, ...history]);
          setAlerts(alerts.filter(a => a.id !== id));
        }
      } else {
        setAlerts(alerts.map(a => a.id === id ? { ...a, status: nextStatus } : a));
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <Layout role="ambulance">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-3 rounded-full border border-red-200">
            <Siren className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-darknavy">Ambulance Dispatch Control</h2>
        </div>

        {/* Active Alerts */}
        <div>
          <h3 className="text-xl font-bold text-darknavy mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Active SOS Alerts
          </h3>
          
          {loading ? (
            <p className="text-slate-500">Loading active alerts...</p>
          ) : alerts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {alerts.map((alert) => {
                const action = getNextAction(alert.status);
                return (
                  <div key={alert.id} className="bg-white rounded-xl shadow-md border-l-4 border-red-500 border-y border-r border-slate-100 overflow-hidden relative">
                    {alert.status === 'Alert Sent' && (
                      <div className="absolute top-0 right-0 p-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-darknavy">{alert.patient_name}</h4>
                          <p className="text-sm text-slate-500 font-mono">{alert.health_id}</p>
                        </div>
                        <StatusBadge status={alert.status} />
                      </div>
                      
                      <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <span className="font-medium text-slate-700 block">Location</span>
                            <span className="text-slate-600">{alert.location_text}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-5 h-5 text-slate-400" />
                          <div>
                            <span className="font-medium text-slate-700 block">Phone</span>
                            <span className="text-slate-600">{alert.phone || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="w-5 h-5 text-slate-400" />
                          <div>
                            <span className="font-medium text-slate-700 block">Time</span>
                            <span className="text-slate-600">{new Date(alert.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {action && (
                        <button
                          onClick={() => updateStatus(alert.id, action.nextStatus)}
                          className={`w-full py-3 rounded-lg text-white font-medium shadow-sm transition ${action.color}`}
                        >
                          {action.text}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center">
              <div className="inline-block bg-green-100 p-4 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-darknavy">No active SOS alerts at the moment.</p>
              <p className="text-slate-500 mt-1">All clear. Stand by for emergencies.</p>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h3 className="text-xl font-bold text-darknavy mb-4 flex items-center gap-2">
            <History className="w-6 h-6 text-primary-600" />
            Completed Calls History
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                  <tr>
                    <th className="py-4 px-6 font-medium">Patient Info</th>
                    <th className="py-4 px-6 font-medium">Location</th>
                    <th className="py-4 px-6 font-medium">Date & Time</th>
                    <th className="py-4 px-6 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length > 0 ? history.map((call, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-6">
                        <p className="font-medium text-darknavy">{call.patient_name}</p>
                        <p className="text-sm text-slate-500 font-mono">{call.health_id}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" /> {call.location_text}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">{new Date(call.created_at).toLocaleString()}</td>
                      <td className="py-4 px-6"><StatusBadge status="Completed" /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-500">No completed calls history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default AmbulanceDashboard;
