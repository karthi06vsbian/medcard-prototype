import React, { useState, useEffect } from 'react';
import { Pill, Package, Truck, CheckCircle, Plus, X, ShoppingBag } from 'lucide-react';
import api from '../../lib/api';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';

export default function MedicineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('500mg - 1 tablet daily');
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [message, setMessage] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/patient/prescriptions');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching prescriptions/orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOrderMedicine = async (e) => {
    e.preventDefault();
    if (!medicineName.trim()) return;
    setOrdering(true);
    setMessage('');
    try {
      await api.post('/api/patient/orders', {
        medicine_name: medicineName,
        dosage,
        quantity: parseInt(quantity, 10) || 1
      });
      setMessage('Medicine ordered successfully!');
      setMedicineName('');
      setDosage('500mg - 1 tablet daily');
      setQuantity(1);
      setShowOrderModal(false);
      fetchOrders();
    } catch (err) {
      setMessage('Failed to place order.');
    } finally {
      setOrdering(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'ordered': return <Package className="h-5 w-5 text-amber-500" />;
      case 'packed': return <Package className="h-5 w-5 text-primary-500" />;
      case 'out for delivery': return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Pill className="h-5 w-5 text-primary-500" />;
    }
  };

  return (
    <Layout role="patient">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header with Order Medicine Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <Pill className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-darknavy">Medicine Orders</h1>
              <p className="text-sm text-slate-500">Order medicines directly or track doctor prescriptions</p>
            </div>
          </div>
          <button
            onClick={() => setShowOrderModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition duration-200"
          >
            <Plus size={18} />
            Order Medicine
          </button>
        </div>

        {message && (
          <div className="p-3 bg-primary-50 text-primary-800 border border-primary-200 rounded-xl text-sm font-medium">
            {message}
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowOrderModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-darknavy flex items-center gap-2">
                  <ShoppingBag className="text-primary-600" size={20} />
                  Order Medicine
                </h3>
                <button onClick={() => setShowOrderModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleOrderMedicine} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg / Dolo 650"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm text-darknavy bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dosage / Instructions</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 tablet twice daily after meals"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm text-darknavy bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm text-darknavy bg-white"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ordering}
                    className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {ordering ? 'Ordering...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <Pill className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-darknavy">No active medicine orders</h3>
            <p className="text-slate-500 mt-2 mb-4">You have not ordered any medicines yet.</p>
            <button
              onClick={() => setShowOrderModal(true)}
              className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition shadow-sm"
            >
              <Plus size={16} />
              Order Medicine Now
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center text-sm text-slate-500 font-medium">
                    Order #{order.id} • {new Date(order.created_at || Date.now()).toLocaleDateString()}
                  </div>
                  <StatusBadge status={order.delivery_status || order.status || 'Ordered'} />
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-darknavy mb-1">{order.medicine_name}</h3>
                    <div className="text-sm text-slate-600 flex space-x-4">
                      <span><span className="font-medium text-slate-700">Dosage:</span> {order.dosage}</span>
                      <span><span className="font-medium text-slate-700">Qty:</span> {order.quantity}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-500 mb-4 border-t border-slate-50 pt-3">
                    Prescribed / Ordered by <span className="font-medium text-slate-700">{order.doctor_name ? (order.doctor_name.startsWith('Dr.') ? order.doctor_name : `Dr. ${order.doctor_name}`) : 'Self / Direct Order'}</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between border border-slate-100">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.delivery_status || order.status)}
                      <span className="text-sm font-medium text-slate-800 capitalize">
                        {order.delivery_status || order.status || 'Ordered'}
                      </span>
                    </div>
                    {(order.delivery_status || order.status) !== 'Delivered' && (
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                        In Progress
                      </span>
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
}
