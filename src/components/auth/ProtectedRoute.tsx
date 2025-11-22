import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Afficher un loader pendant la vérification de la session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  // Rediriger vers /login si pas authentifié
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Afficher la route protégée
  return <Outlet />;
}
