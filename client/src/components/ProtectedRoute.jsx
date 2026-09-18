import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getLoginPath = (role) => {
  switch (role) {
    case 'patient': return '/login';
    case 'doctor': return '/doctor';
    case 'pharmacy': return '/medicalshop';
    case 'ambulance': return '/ambulance';
    case 'admin': return '/admin';
    default: return '/';
  }
};

const ProtectedRoute = ({ role, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getLoginPath(role)} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
