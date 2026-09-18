import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChatbot from './components/FloatingChatbot';

// Import all page components
import LandingPage from './pages/public/LandingPage';
import PatientLogin from './pages/public/PatientLogin';
import PatientDashboard from './pages/patient/Dashboard';
import MedicalHistory from './pages/patient/MedicalHistory';
import BookAppointment from './pages/patient/BookAppointment';
import AIChatbot from './pages/patient/AIChatbot';
import MedicineOrders from './pages/patient/MedicineOrders';
import Insurance from './pages/patient/Insurance';
import DoctorLogin from './pages/doctor/DoctorLogin';
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointments from './pages/doctor/Appointments';
import PharmacyLogin from './pages/medicalshop/PharmacyLogin';
import PharmacyDashboard from './pages/medicalshop/Dashboard';
import AmbulanceLogin from './pages/ambulance/AmbulanceLogin';
import AmbulanceDashboard from './pages/ambulance/Dashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <>
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

      {/* Floating AI Doctor Chatbot — visible only for patient users */}
      <FloatingChatbot />
    </>
  );
}

export default App;
