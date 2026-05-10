import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import { Wallet, LogOut, Shield, LayoutDashboard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-orange-600 p-1.5 rounded-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Zemen</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-zinc-400">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
               <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/deposit" className="hover:text-white transition-colors flex items-center gap-1.5">
               <ArrowDownCircle className="w-4 h-4" /> Deposit
            </Link>
            <Link to="/withdraw" className="hover:text-white transition-colors flex items-center gap-1.5">
               <ArrowUpCircle className="w-4 h-4" /> Withdraw
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1.5 font-bold">
                 <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 pl-4 border-l border-zinc-800">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-zinc-500">Logged in as</p>
              <p className="text-sm font-semibold text-white">{user.name || user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
