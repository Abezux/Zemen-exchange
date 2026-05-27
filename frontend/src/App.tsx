import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DepositPage } from './pages/DepositPage.tsx';
import { WithdrawPage } from './pages/WithdrawPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { P2PPage } from './pages/P2PPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { useAuthStore } from './store/authStore.ts';
import { useNotificationStore } from './store/notificationStore.ts';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

export default function App() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const initSocket = useNotificationStore((state) => state.init);
  const disconnectSocket = useNotificationStore((state) => state.disconnect);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initSocket(user.id);
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user?.id, initSocket, disconnectSocket]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/deposit" element={
            <ProtectedRoute>
              <DepositPage />
            </ProtectedRoute>
          } />
          <Route path="/withdraw" element={
            <ProtectedRoute>
              <WithdrawPage />
            </ProtectedRoute>
          } />
          <Route path="/p2p" element={
            <ProtectedRoute>
              <P2PPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="ADMIN">
              <AdminPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
