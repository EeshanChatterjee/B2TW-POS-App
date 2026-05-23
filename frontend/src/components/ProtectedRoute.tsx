import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/useStore'

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'operator' | 'manager' | 'admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoggedIn, role } = useAppSelector((state) => state.auth);

  // Not logged in - redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
