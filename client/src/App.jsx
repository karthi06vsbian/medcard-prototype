import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChatbot from './components/FloatingChatbot';

// Eager load LandingPage for instant initial paint
import LandingPage from './pages/public/LandingPage';

// Lazy load other routes on-demand
const PatientLogin = lazy(() => import('./pages/public/PatientLogin'));
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const MedicalHistory = lazy(() => import('./pages/patient/MedicalHistory'));
const BookAppointment = lazy(() => import('./pages/patient/BookAppointment'));
const AIChatbot = lazy(() => import('./pages/patient/AIChatbot'));
const MedicineOrders = lazy(() => import('./pages/patient/MedicineOrders'));
const Insurance = lazy(() => import('./pages/patient/Insurance'));
const DoctorLogin = lazy(() => import('./pages/doctor/DoctorLogin'));
const DoctorDashboard = lazy(() => import('./pages/doctor/Dashboard'));
const DoctorAppointments = lazy(() => import('./pages/doctor/Appointments'));
const PharmacyLogin = lazy(() => import('./pages/medicalshop/PharmacyLogin'));
const PharmacyDashboard = lazy(() => import('./pages/medicalshop/Dashboard'));
const AmbulanceLogin = lazy(() => import('./pages/ambulance/AmbulanceLogin'));
const AmbulanceDashboard = lazy(() => import('./pages/ambulance/Dashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F5F9FF]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PatientLogin />} />
          
          {/* Patient - Protected */}
          <Route path="/patient/dashboard" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/history" element={<ProtectedRoute role="patient"><MedicalHistory /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute role="patient"><BookAppointment /></ProtectedRoute>} />
          <Route path="/patient/chatbot" element={<ProtectedRoute role="patient"><AIChatbot /></ProtectedRoute>} />
          <Route path="/patient/orders" element={<ProtectedRoute role="patient"><MedicineOrders /></ProtectedRoute>} />
          <Route path="/patient/insurance" element={<ProtectedRoute role="patient"><Insurance /></ProtectedRoute>} />
          
          {/* Doctor - Hidden login + Protected dashboard */}
          <Route path="/doctor" element={<DoctorLogin />} />
          <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><DoctorAppointments /></ProtectedRoute>} />
          
          {/* Pharmacy */}
          <Route path="/medicalshop" element={<PharmacyLogin />} />
          <Route path="/medicalshop/dashboard" element={<ProtectedRoute role="pharmacy"><PharmacyDashboard /></ProtectedRoute>} />
          
          {/* Ambulance */}
          <Route path="/ambulance" element={<AmbulanceLogin />} />
          <Route path="/ambulance/dashboard" element={<ProtectedRoute role="ambulance"><AmbulanceDashboard /></ProtectedRoute>} />
          <Route path="/ambulance/history" element={<ProtectedRoute role="ambulance"><AmbulanceDashboard /></ProtectedRoute>} />
          
          {/* Admin */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/patients" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/doctors" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/pharmacies" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/ambulances" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Suspense>

      {/* Floating AI Doctor Chatbot — visible only for patient users */}
      <FloatingChatbot />
    </>
  );
}

export default App;
