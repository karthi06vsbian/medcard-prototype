import React, { useState, useEffect } from 'react';
import { Pill, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import api from '../../lib/api';

const PharmacyDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/api/pharmacy/orders');
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/api/pharmacy/orders/${id}/status`, { status: newStatus });
      setMessage(`Order #${id} updated to ${newStatus}`);
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update status.');
    }
  };

  const stats = {
    ordered: orders.filter(o => o.status === 'Ordered').length,
    packed: orders.filter(o => o.status === 'Packed').length,
    outForDelivery: orders.filter(o => o.status === 'Out for Delivery').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
  };

  const statusOptions = ['Ordered', 'Packed', 'Out for Delivery', 'Delivered'];

  return (
    <Layout role="pharmacy">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-darknavy flex items-center gap-2">
            <Package className="w-7 h-7 text-secondary-600" />
            Prescription Orders
          </h2>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-amber-400 border-x border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase">Ordered</p>
              <p className="text-3xl font-bold text-darknavy">{stats.ordered}</p>
            </div>
            <Clock className="w-10 h-10 text-amber-200" />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-primary-400 border-x border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase">Packed</p>
              <p className="text-3xl font-bold text-darknavy">{stats.packed}</p>
            </div>
            <Package className="w-10 h-10 text-primary-200" />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-secondary-400 border-x border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase">Out for Delivery</p>
              <p className="text-3xl font-bold text-darknavy">{stats.outForDelivery}</p>
            </div>
            <Truck className="w-10 h-10 text-secondary-200" />
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-400 border-x border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase">Delivered</p>
              <p className="text-3xl font-bold text-darknavy">{stats.delivered}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
        </div>

        {message && (
          <div className="p-4 bg-secondary-50 text-secondary-800 rounded-lg shadow-sm border border-secondary-200">
            {message}
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-darknavy flex items-center gap-2">
              <Pill className="w-5 h-5 text-secondary-600" /> All Orders
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading orders...</div>
            ) : orders.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                  <tr>
                    <th className="py-4 px-6 font-medium">Order ID</th>
                    <th className="py-4 px-6 font-medium">Patient Info</th>
                    <th className="py-4 px-6 font-medium">Medicine Details</th>
                    <th className="py-4 px-6 font-medium">Doctor / Date</th>
                    <th className="py-4 px-6 font-medium">Status</th>
                    <th className="py-4 px-6 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-medium text-darknavy">#{order.id}</td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-darknavy">{order.patient_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{order.health_id}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-darknavy">{order.medicine_name} <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs ml-1">x{order.quantity}</span></p>
                        <p className="text-xs text-slate-500">{order.dosage}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <p>{order.doctor_name}</p>
                        <p className="text-xs">{new Date(order.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-6">
                        <select 
                          className="bg-white border border-slate-200 text-darknavy text-sm rounded-lg focus:ring-secondary-500 focus:border-secondary-500 block w-full p-2"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          {statusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 italic">No orders found.</div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default PharmacyDashboard;
