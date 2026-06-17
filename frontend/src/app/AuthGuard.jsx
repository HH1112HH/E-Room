import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/AppShell.css';

export function AuthGuard({ children, requireOnboarding = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="authguard-loading">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOnboarding && user && !user.profile_completed && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
