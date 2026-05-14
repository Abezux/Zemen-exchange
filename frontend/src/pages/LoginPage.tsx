import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import axios from 'axios';
import { Wallet, ShieldCheck, Zap, Lock } from 'lucide-react';
import { motion } from 'motion/react';

declare global {
  interface Window {
    google: any;
  }
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "PROVIDE_GOOGLE_CLIENT_ID",
          callback: async (response: any) => {
            try {
              const res = await axios.post('/api/auth/google', {
                credential: response.credential,
              });
              setUser(res.data.user);
              navigate('/');
            } catch (error) {
              console.error('Login failed', error);
              alert('Login failed. Please try again.');
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: 320,
          });
        }
      }
    };

    const interval = setInterval(() => {
      if (window.google) {
        initializeGoogle();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {/* Left Pane - Branding & Value Prop */}
      <div className="hidden md:flex flex-1 p-8 md:p-12 flex-col justify-between relative overflow-hidden bg-zinc-950">
        <div className="z-10">
          <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-12">
            <div className="bg-orange-600 p-1.5 md:p-2 rounded-xl">
              <Wallet className="w-6 md:w-8 h-6 md:h-8 text-white" />
            </div>
            <span className="text-2xl md:text-3xl font-bold tracking-tighter text-white uppercase italic">Zemen</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white leading-tight mb-4 md:mb-8 tracking-tighter uppercase italic">
              Fast and secure<br />
              <span className="text-orange-500">P2P trading</span>
            </h1>
            <p className="text-zinc-400 text-base md:text-xl max-w-md leading-relaxed">
              Trade with verified merchants. Funds are held in escrow.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-8 z-10">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <ShieldCheck className="text-orange-500 w-5 md:w-6 h-5 md:h-6" />
            <span className="text-white font-bold uppercase text-[10px] md:text-xs tracking-widest">Automatic Audit</span>
            <span className="text-zinc-500 text-xs md:text-sm">Every transaction verified.</span>
          </div>
          <div className="flex flex-col gap-1.5 md:gap-2">
            <Zap className="text-orange-500 w-5 md:w-6 h-5 md:h-6" />
            <span className="text-white font-bold uppercase text-[10px] md:text-xs tracking-widest">Direct ETB</span>
            <span className="text-zinc-500 text-xs md:text-sm">Convert to any wallet.</span>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-600/5 rounded-full blur-[120px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-800/10 rounded-full blur-[80px] -ml-20 -mb-20"></div>
      </div>

      {/* Right Pane - Login Box */}
      <div className="w-full md:w-[450px] bg-black md:border-l border-b md:border-b-0 border-zinc-900 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 sm:mb-8 md:mb-12 text-center">
            <Lock className="w-10 sm:w-12 h-10 sm:h-12 text-zinc-800 mx-auto mb-2 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Secure Login</h2>
            <p className="text-xs sm:text-sm text-zinc-500">Sign in with Google to access your wallet.</p>
          </div>

          <div className="bg-zinc-900/50 p-4 sm:p-6 md:p-8 rounded-3xl border border-zinc-800 backdrop-blur-sm shadow-2xl">
            <div className="flex justify-center mb-4 sm:mb-6" ref={googleBtnRef}></div>
            <div className="mt-6 sm:mt-8 md:mt-8 pt-4 sm:pt-6 md:pt-8 border-t border-zinc-800 flex flex-col gap-3 sm:gap-4 text-center">
               <p className="text-[8px] sm:text-xs text-zinc-600 leading-relaxed uppercase tracking-widest font-bold">
                 Only authorised personnel can access this platform.
               </p>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 md:mt-12 text-center italic">
            <p className="text-[8px] sm:text-xs text-zinc-700">
              By signing in, you agree to our custody terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
