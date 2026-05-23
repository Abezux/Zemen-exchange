import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import { Wallet, LogOut, Shield, LayoutDashboard, ArrowDownCircle, ArrowUpCircle, User, Menu, X } from 'lucide-react';
import { NotificationDropdown } from './notificationDropdown.tsx';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-orange-600 p-1.5 rounded-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Zemen</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
               <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/deposit" className="hover:text-white transition-colors flex items-center gap-1.5">
               <ArrowDownCircle className="w-4 h-4" /> Deposit
            </Link>
            <Link to="/withdraw" className="hover:text-white transition-colors flex items-center gap-1.5">
               <ArrowUpCircle className="w-4 h-4" /> Withdraw
            </Link>
            <Link to="/profile" className="hover:text-white transition-colors flex items-center gap-1.5">
               <User className="w-4 h-4" /> Profile
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1.5 font-bold">
                 <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 pl-0 md:pl-4 md:border-l md:border-zinc-800">
            <NotificationDropdown />
            <div className="hidden sm:block text-right">
              <p className="text-xs text-zinc-500 font-medium">Logged in as</p>
              <p className="text-sm font-bold text-white leading-none mt-1">{user.name || user.email}</p>
            </div>
            
            {/* Desktop Logout Button */}
            <button 
              onClick={handleLogout}
              className="hidden md:flex p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Menu Toggle button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-850 hover:bg-zinc-800 rounded-xl transition-all"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 pt-3 pb-2 border-t border-zinc-800 flex flex-col gap-1 text-sm font-bold text-zinc-400">
          <Link 
            to="/" 
            className="hover:text-white hover:bg-zinc-850 py-3 px-4 rounded-xl flex items-center gap-2.5 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <LayoutDashboard className="w-4 h-4 text-zinc-500" /> Dashboard
          </Link>
          <Link 
            to="/deposit" 
            className="hover:text-white hover:bg-zinc-850 py-3 px-4 rounded-xl flex items-center gap-2.5 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ArrowDownCircle className="w-4 h-4 text-zinc-500" /> Deposit USDT
          </Link>
          <Link 
            to="/withdraw" 
            className="hover:text-white hover:bg-zinc-850 py-3 px-4 rounded-xl flex items-center gap-2.5 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ArrowUpCircle className="w-4 h-4 text-zinc-500" /> Withdraw USDT
          </Link>
          <Link 
            to="/profile" 
            className="hover:text-white hover:bg-zinc-850 py-3 px-4 rounded-xl flex items-center gap-2.5 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <User className="w-4 h-4 text-zinc-500" /> My Profile
          </Link>
          {user.role === 'ADMIN' && (
            <Link 
              to="/admin" 
              className="text-orange-500 hover:text-orange-400 hover:bg-zinc-850 py-3 px-4 rounded-xl flex items-center gap-2.5 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Shield className="w-4 h-4 text-orange-500" /> Admin Terminal
            </Link>
          )}
          <div className="border-t border-zinc-850/50 mt-2 pt-2 px-4 flex justify-between items-center text-xs text-zinc-500 font-medium">
            <span>User: {user.name || user.email}</span>
            <button 
              onClick={handleLogout}
              className="text-red-500 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-red-400 py-1 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
