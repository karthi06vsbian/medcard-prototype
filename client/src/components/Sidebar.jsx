import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Activity, 
  LayoutDashboard, 
  History, 
  Calendar, 
  MessageSquare, 
  Pill, 
  Users, 
  LogOut,
  Menu,
  X,
  Stethoscope,
  Truck,
  Store,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getMenuByRole = (role) => {
  switch (role) {
    case 'patient':
      return [
        { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
        { name: 'Medical History', path: '/patient/history', icon: History },
        { name: 'Book Appointment', path: '/patient/appointments', icon: Calendar },
        { name: 'AI Chatbot', path: '/patient/chatbot', icon: MessageSquare },
        { name: 'Medicine Orders', path: '/patient/orders', icon: Pill },
        { name: 'Medical Insurance', path: '/patient/insurance', icon: Shield },
      ];
    case 'doctor':
      return [
        { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
        { name: 'My Appointments', path: '/doctor/appointments', icon: Calendar },
      ];
    case 'pharmacy':
      return [
        { name: 'Dashboard (Orders)', path: '/medicalshop/dashboard', icon: LayoutDashboard },
      ];
    case 'ambulance':
      return [
        { name: 'Dashboard (Alerts)', path: '/ambulance/dashboard', icon: LayoutDashboard },
        { name: 'History', path: '/ambulance/history', icon: History },
      ];
    case 'admin':
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Patients', path: '/admin/patients', icon: Users },
        { name: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
        { name: 'Pharmacies', path: '/admin/pharmacies', icon: Store },
        { name: 'Ambulances', path: '/admin/ambulances', icon: Truck },
      ];
    default:
      return [];
  }
};

const getRoleActiveStyle = (role) => {
  switch (role) {
    case 'doctor':
      return {
        active: 'bg-secondary-50 text-secondary-700 font-semibold border-r-4 border-secondary-600',
        badge: 'text-secondary-600 bg-secondary-50',
        roleLabel: 'Doctor Portal'
      };
    case 'pharmacy':
      return {
        active: 'bg-cyan-50 text-cyan-800 font-semibold border-r-4 border-cyan-600',
        badge: 'text-cyan-700 bg-cyan-50',
        roleLabel: 'Pharmacy Portal'
      };
    case 'ambulance':
      return {
        active: 'bg-red-50 text-red-700 font-semibold border-r-4 border-red-600',
        badge: 'text-red-700 bg-red-50',
        roleLabel: 'Ambulance Unit'
      };
    case 'admin':
      return {
        active: 'bg-slate-100 text-darknavy font-semibold border-r-4 border-darknavy',
        badge: 'text-darknavy bg-slate-100',
        roleLabel: 'Admin Portal'
      };
    case 'patient':
    default:
      return {
        active: 'bg-primary-50 text-primary-700 font-semibold border-r-4 border-primary-600',
        badge: 'text-primary-600 bg-primary-50',
        roleLabel: 'Patient Portal'
      };
  }
};

const Sidebar = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const menuItems = getMenuByRole(role);
  const roleStyles = getRoleActiveStyle(role);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile toggle */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-md border border-slate-200 text-darknavy"
        onClick={toggleSidebar}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white border-r border-slate-200 w-64 z-50 flex flex-col
        transition-transform duration-300 ease-in-out transform shadow-xs
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src="/medicard-icon.png" alt="MediCard" className="w-10 h-10 rounded-xl object-contain shadow-xs border border-slate-100" />
            <div>
              <span className="text-lg font-bold text-darknavy tracking-tight block">MediCard</span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{roleStyles.roleLabel}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150
                  ${isActive 
                    ? roleStyles.active
                    : 'text-slate-600 hover:bg-[#F5F9FF] hover:text-darknavy font-medium'}
                `}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
