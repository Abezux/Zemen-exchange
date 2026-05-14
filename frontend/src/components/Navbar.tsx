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
    <nav className="bg-zinc-900 border-b border-zinc-800 px-2 sm:px-4 py-2 sm:py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-1 sm:gap-2">
          <div className="bg-orange-600 p-1 sm:p-1.5 rounded-lg">
            <Wallet className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
          </div>
          <span className="font-bold text-base sm:text-xl tracking-tight text-white">Zemen</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-zinc-400">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
               <LayoutDashboard className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" /> <span className="hidden lg:inline">Dashboard</span>
            </Link>
            <Link to="/deposit" className="hover:text-white transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
               <ArrowDownCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" /> <span className="hidden lg:inline">Deposit</span>
            </Link>
            <Link to="/withdraw" className="hover:text-white transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
               <ArrowUpCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" /> <span className="hidden lg:inline">Withdraw</span>
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1 sm:gap-1.5 font-bold whitespace-nowrap">
                 <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" /> <span className="hidden lg:inline">Admin</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-4 border-l border-zinc-800">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] sm:text-xs text-zinc-500">Logged in as</p>
              <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-none">{user.name || user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-all shrink-0"
              title="Logout"
            >
              <LogOut className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
