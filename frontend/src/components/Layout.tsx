import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar.tsx';
import { useAuthStore } from '../store/authStore.ts';
import { useNotificationStore } from '../store/notificationStore.ts';

export const Layout = () => {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const initSocket = useNotificationStore((state) => state.init);
  const disconnectSocket = useNotificationStore((state) => state.disconnect);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check auth if we haven't already
    if (!isAuthenticated && isLoading) {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initSocket(user.id);
    } else {
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.id, initSocket, disconnectSocket]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
