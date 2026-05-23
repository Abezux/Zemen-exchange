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
          const screenWidth = window.innerWidth;
          const buttonWidth = screenWidth < 360 ? 250 : (screenWidth < 400 ? 280 : 320);

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: buttonWidth,
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
    <div className="min-h-screen bg-black flex flex-col md:flex-row overflow-y-auto md:overflow-hidden font-sans">
      {/* Left Pane - Branding & Value Prop */}
      <div className="flex-1 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-zinc-950 border-b md:border-b-0 border-zinc-900 min-h-[50vh] md:min-h-screen">
        <div className="z-10 flex flex-col justify-between h-full space-y-8 md:space-y-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 p-2 rounded-xl">
              <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase italic">Zemen</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="my-auto py-6 md:py-12"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-3 sm:mb-6 tracking-tighter uppercase italic">
              Fast and secure<br />
              <span className="text-orange-500">P2P trading</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm md:text-base lg:text-lg max-w-sm sm:max-w-md leading-relaxed font-semibold">
              Trade safely with verified merchants. Your digital funds are securely protected in our multi-sig escrow system.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-4 border-t border-zinc-900/60">
            <div className="flex flex-col gap-1 sm:gap-2">
              <ShieldCheck className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="text-white font-black uppercase text-[10px] sm:text-xs tracking-widest italic">Automatic Audit</span>
              <span className="text-zinc-500 text-xs sm:text-sm font-medium">Every transaction is automatically audited and verified by our support operations.</span>
            </div>
            <div className="flex flex-col gap-1 sm:gap-2">
              <Zap className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="text-white font-black uppercase text-[10px] sm:text-xs tracking-widest italic">Direct Settlement</span>
              <span className="text-zinc-500 text-xs sm:text-sm font-medium">Instantly convert and withdraw your USDT balance to any local bank or mobile wallet.</span>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-orange-600/5 rounded-full blur-[100px] sm:blur-[120px] -mr-20 sm:-mr-40 -mt-20 sm:-mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-zinc-800/10 rounded-full blur-[60px] sm:blur-[80px] -ml-10 sm:-ml-20 -mb-10 sm:-mb-20 pointer-events-none"></div>
      </div>

      {/* Right Pane - Login Box */}
      <div className="w-full md:w-[420px] lg:w-[480px] bg-black border-zinc-900 flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 shrink-0 md:min-h-screen">
        <div className="w-full max-w-sm flex flex-col justify-between py-6 md:py-0">
          <div className="mb-8 md:mb-12 text-center">
            <div className="bg-zinc-900/80 border border-zinc-805 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 italic uppercase tracking-tight">Secure Portal</h2>
            <p className="text-zinc-500 text-xs sm:text-sm font-medium">Sign in with your Google account to access your Zemen wallet.</p>
          </div>

          <div className="bg-zinc-900/40 p-6 sm:p-8 rounded-3xl border border-zinc-850 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex justify-center mb-6" ref={googleBtnRef}></div>
            <div className="mt-6 pt-6 border-t border-zinc-850/55 flex flex-col gap-4 text-center">
               <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider font-extrabold italic">
                 Authorized Personnel Only
               </p>
            </div>
          </div>

          <div className="mt-8 md:mt-12 text-center">
            <p className="text-[10px] text-zinc-650 font-medium">
              By signing in, you agree to our specialized escrow custody terms & AML/KYC policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
