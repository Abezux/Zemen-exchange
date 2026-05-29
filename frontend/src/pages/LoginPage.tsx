import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.ts';
import axios from 'axios';
import { 
  Wallet, ShieldCheck, Zap, Lock, ArrowRight, CheckCircle2, AlertCircle, 
  Smartphone, HelpCircle, Phone, Mail, FileText, ChevronDown, ChevronUp, 
  Play, ExternalLink, Shield, ArrowRightLeft, Check, TrendingUp, Sparkles, 
  Users, Award, ShieldAlert, Info, Menu, X, ArrowDownRight, ArrowUpRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    google: any;
  }
}

const paymentPartners = [
  { name: 'Commercial Bank of Ethiopia', code: 'CBE', image: '/Cbe.png' },
  { name: 'Telebirr Mobile Wallet', code: 'TELEBIRR', image: '/Telebirr.png' },
  { name: 'Bank of Abyssinia', code: 'BOA', image: '/boa.png' },
  { name: 'Awash Bank', code: 'AWASH', image: '/Awash.png' },
  { name: 'Dashen Bank', code: 'DASHEN', image: '/Dashen.png' },
  { name: 'CBE Birr Wallet', code: 'CBEBIRR', image: '/CBEbirr.png' }
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  
  // UI and Animation States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState<'BUY' | 'SELL'>('BUY');
  const [activeLearnTab, setActiveLearnTab] = useState(0);
  const [isLearnPlayerActive, setIsLearnPlayerActive] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [paymentImageErrors, setPaymentImageErrors] = useState<Record<string, boolean>>({});

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

  // Google Sign-In Initialization (must keep intact for actual auth to work)
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
              setIsLoginModalOpen(false);
              navigate('/');
            } catch (error) {
              console.error('Login failed', error);
              alert('Login failed. Please try again.');
            }
          },
        });

        if (googleBtnRef.current) {
          const screenWidth = window.innerWidth;
          const buttonWidth = screenWidth < 360 ? 240 : (screenWidth < 400 ? 270 : 310);

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
  }, [navigate, setUser, isLoginModalOpen]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // height of floating navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  // Mock Market Prices & Active Merchants data
  const mockMerchants = {
    BUY: [
      { id: 1, name: 'Aman_USDT', rate: 180.80, orders: 1420, completion: '99.8%', limits: '5,000 - 150,000 ETB', systems: ['CBE', 'TELEBIRR'], recommended: true },
      { id: 2, name: 'Zemen_Escrow', rate: 181.10, orders: 890, completion: '98.5%', limits: '10,000 - 250,050 ETB', systems: ['CBE', 'CBE BIRR'] },
      { id: 3, name: 'Safi_Fintech', rate: 179.40, orders: 430, completion: '100%', limits: '3,000 - 90,000 ETB', systems: ['TELEBIRR', 'AWASH'] }
    ],
    SELL: [
      { id: 1, name: 'Ethio_Capital', rate: 180.10, orders: 1120, completion: '99.4%', limits: '5,000 - 120,000 ETB', systems: ['CBE', 'TELEBIRR'], recommended: true },
      { id: 2, name: 'Niko_Merchant', rate: 183.90, orders: 670, completion: '97.2%', limits: '8,000 - 180,000 ETB', systems: ['DASHEN', 'CBE'] },
      { id: 3, name: 'Selam_Trust', rate: 179.65, orders: 340, completion: '100%', limits: '2,000 - 65,000 ETB', systems: ['CBE BIRR', 'TELEBIRR'] }
    ]
  };

  // Modern Tutorial Content Definition
  const tutorialTabs = [
    {
      title: 'How P2P Works',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder valid video layout
      desc: 'Discover Zemenex\'s multi-sig escrow system which safely locks exchange assets until both parties have settled locally.',
      benefits: ['100% Secure custody', 'Automatic release triggers', 'Rapid arbiter desk ready to support anytime']
    },
    {
      title: 'Buying USDT',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      desc: 'Learn how to easily submit buy requests, check rates, and complete mobile or bank payouts within seconds to local sellers.',
      benefits: ['Pay with Telebirr or CBE', 'No crypto deposit fee', 'Safe receipt confirmation steps']
    },
    {
      title: 'Selling USDT',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      desc: 'Monetize digital assets easily. Post or select merchant offers, verify incoming ETB transfers directly, and execute seamless cash outs.',
      benefits: ['Instant feedback dashboard', 'Locked escrow safeguards', 'Multi-bank compatibility']
    },
    {
      title: 'Safe Trading Guidelines',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      desc: 'Expert guide to secure peer-to-peer execution. Minimize dispute risks, spot fraud traces, and authenticate counterparty tags.',
      benefits: ['Verify payment receipt first', 'Never release outside systems', 'Always secure chat proofs']
    }
  ];

  return (
    <div id="home" className="min-h-screen bg-[#050505] text-zinc-350 relative overflow-x-hidden selection:bg-orange-600/30 selection:text-white">
      
      {/* BACKGROUND GLOWS AND NOISE */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-orange-500/5 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-10 w-[500px] h-[500px] bg-[#fb923c]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* FLOATING NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-black/60 backdrop-blur-xl border-b border-zinc-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('home')}>
              <div className="bg-gradient-to-tr from-orange-600 to-orange-500 p-2 rounded-xl shadow-lg shadow-orange-600/20">
                <Wallet className="w-5.5 h-5.5 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase italic">
                Zemene<span className="text-orange-500">x</span>
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8 font-semibold text-xs sm:text-sm">
              <button onClick={() => scrollToSection('home')} className="text-zinc-400 hover:text-white transition-colors">Home</button>
              <button onClick={() => scrollToSection('preview')} className="text-zinc-400 hover:text-white transition-colors">P2P Preview</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-zinc-400 hover:text-white transition-colors">How It Works</button>
              <button onClick={() => scrollToSection('learn')} className="text-zinc-400 hover:text-white transition-colors">Learn</button>
              <button onClick={() => scrollToSection('trust')} className="text-zinc-400 hover:text-white transition-colors">Security</button>
              <button onClick={() => scrollToSection('faqs')} className="text-zinc-400 hover:text-white transition-colors">FAQ</button>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-5 py-2.5 rounded-xl border border-zinc-800 text-sm font-semibold text-white hover:bg-zinc-900 transition-all uppercase italic"
              >
                Login
              </button>
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-sm font-black text-white hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 uppercase italic"
              >
                Start Trading <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Icon */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0c0c0c] border-b border-zinc-900/80 py-4 px-6 overflow-hidden flex flex-col gap-4 font-semibold text-sm"
            >
              <button onClick={() => scrollToSection('home')} className="text-left py-2 text-zinc-400 hover:text-white">Home</button>
              <button onClick={() => scrollToSection('preview')} className="text-left py-2 text-zinc-400 hover:text-white">P2P Preview</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2 text-zinc-400 hover:text-white">How It Works</button>
              <button onClick={() => scrollToSection('learn')} className="text-left py-2 text-zinc-400 hover:text-white">Learn</button>
              <button onClick={() => scrollToSection('trust')} className="text-left py-2 text-zinc-400 hover:text-white">Security</button>
              <button onClick={() => scrollToSection('faqs')} className="text-left py-2 text-zinc-400 hover:text-white">FAQ</button>
              <div className="flex gap-4 pt-2 border-t border-zinc-900">
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex-1 py-3 text-center rounded-xl border border-zinc-800 text-white text-xs uppercase italic font-bold"
                >
                  Login
                </button>
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex-1 py-3 text-center rounded-xl bg-orange-600 text-white text-xs uppercase italic font-black"
                >
                  Start Trading
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Intro Text Column */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-600/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider italic">
            <Sparkles className="w-3.5 h-3.5" /> V 1.2
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight uppercase italic">
            Trade ETB/USDT<br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-450 to-[#fdba74] bg-clip-text text-transparent">
              Securely
            </span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-semibold">
            Safe P2P crypto trading with automated escrow 
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="px-8 py-4 rounded-2xl bg-orange-600 text-white font-black hover:bg-orange-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20 uppercase italic text-sm md:text-base"
            >
              Start Trading Now <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="px-8 py-4 rounded-2xl border border-zinc-800 text-white font-semibold hover:bg-zinc-900 transition-all uppercase italic text-sm md:text-base flex items-center justify-center gap-2"
            >
              How It Works
            </button>
          </div>

          {/* Core Trust Pillars */}
          <div className="pt-6 grid grid-cols-3 gap-4 border-t border-zinc-900 max-w-md mx-auto lg:mx-0 text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white italic">0%</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold italic">Buying Fees</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white italic">100%</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold italic">Verified Escrow</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white italic">&lt; 10m</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold italic">Avg. Release Speed</div>
            </div>
          </div>
        </div>

        {/* Right Visual Interactive Component Column */}
        <div className="lg:col-span-5 relative">
          <div className="absolute inset-0 bg-orange-600/10 rounded-[3rem] blur-2xl pointer-events-none -rotate-12 scale-95"></div>
          
          {/* Glass dashboard mockup */}
          <div className="relative bg-zinc-900/45 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-850/80 backdrop-blur-md shadow-2xl">
            {/* Window controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-[10px] bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 px-3 py-1 rounded-full font-black uppercase tracking-wider italic">
                SECURE PLATFORM LIVE
              </span>
            </div>

            {/* Glowing active swap simulation grid card */}
            <div className="space-y-4">
              <div className="bg-black/60 border border-zinc-850 p-4 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-black italic">Pay fiat amount</span>
                  <span className="text-xs text-orange-400 font-bold">Telebirr Wallet</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl sm:text-3xl font-black text-white italic">12,500.00</span>
                  <span className="text-lg font-black text-zinc-400 uppercase italic">ETB</span>
                </div>
              </div>

              {/* Centered Swap Circle Icon */}
              <div className="flex justify-center -my-1">
                <div className="bg-orange-600 p-2.5 rounded-xl border-4 border-zinc-900 relative z-10 shadow-lg">
                  <ArrowRightLeft className="w-4 h-4 text-white rotate-90" />
                </div>
              </div>

              <div className="bg-black/60 border border-zinc-850 p-4 rounded-2xl/2 relative overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-black italic">Receive digital asset</span>
                  <span className="text-xs text-emerald-400 font-bold">Locked in Escrow</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 italic">100.00</span>
                  <span className="text-lg font-black text-zinc-400 uppercase italic">USDT</span>
                </div>
              </div>

              {/* Dynamic Step Tracker Mock */}
              <div className="py-2.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-500 flex items-center justify-center text-[10px] text-orange-400 font-bold">1</div>
                  <span className="text-xs text-zinc-300 font-bold">Buyer registers trade & locks order</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-600/20 border border-orange-500 flex items-center justify-center text-[10px] text-orange-400 font-bold">2</div>
                  <span className="text-xs text-zinc-300 font-bold">Zemenex locks seller\'s USDT escrow</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 font-bold animate-pulse">3</div>
                  <span className="text-xs text-zinc-500 font-medium">Buyer sends local ETB transfer</span>
                </div>
              </div>

              {/* CTA trade portal */}
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-4 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-500 transition-all text-xs uppercase italic tracking-wide flex items-center justify-center gap-2"
              >
                Create Wallet & Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORTED LOCAL PAYMENT METHODS */}
      <section className="bg-zinc-950/40 border-y border-zinc-900/50 py-12 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 mb-6">
          <p className="text-center text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">
            PAYMENT METHODS
          </p>
        </div>

        {/* Slow horizontal scrolling slider */}
        <div className="relative w-full overflow-hidden flex whitespace-nowrap mask-marquee">
          {/* We duplicate the arrays to sustain seamless continuous sliding motion */}
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              ease: "linear", 
              duration: 35, 
              repeat: Infinity 
            }}
            className="flex gap-6 shrink-0 pr-6"
          >
            {[...paymentPartners, ...paymentPartners, ...paymentPartners, ...paymentPartners].map((b, idx) => (
              <div 
                key={idx}
                className="w-52 h-20 shrink-0 bg-zinc-900/30 border border-zinc-900/60 rounded-2xl flex items-center p-4 gap-3.5 group hover:border-orange-500/20 transition-all cursor-default"
              >
                <div className="w-11 h-11 bg-black/40 border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {!paymentImageErrors[`${idx}-${b.code}`] ? (
                    <img 
                      src={b.image} 
                      alt={b.name}
                      className="w-9 h-9 object-contain brightness-95 group-hover:scale-105 transition-transform"
                      onError={() => {
                        setPaymentImageErrors(prev => ({ ...prev, [`${idx}-${b.code}`]: true }));
                      }}
                    />
                  ) : (
                    <div className="text-[10px] font-black text-orange-500 tracking-tight text-center px-1 uppercase italic">
                      {b.code}
                    </div>
                  )}
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-[11px] font-black text-white tracking-widest uppercase italic truncate group-hover:text-orange-500 transition-colors">
                    {b.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-wider block italic transition-colors">
                    {b.name.split(' ').slice(2).join(' ') || 'Instant'}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* LIVE MARKET PREVIEW */}
      <section id="preview" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="text-xs text-orange-500 font-black uppercase tracking-wider italic">
            LIVE ORDERBOOK 
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase italic">
            Check conversion rates
          </h2>
          <p className="text-zinc-400 text-sm max-w-2xl mx-auto font-medium">
            See live ETB/USDT buy and sell prices.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-850 flex gap-1">
            <button 
              onClick={() => setActiveMarketTab('BUY')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase italic transition-all flex items-center gap-2 ${activeMarketTab === 'BUY' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ArrowDownRight className="w-4 h-4 text-emerald-400" /> I want to Buy USDT
            </button>
            <button 
              onClick={() => setActiveMarketTab('SELL')}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase italic transition-all flex items-center gap-2 ${activeMarketTab === 'SELL' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ArrowUpRight className="w-4 h-4 text-red-400" /> I want to Sell USDT
            </button>
          </div>
        </div>

        {/* Live offers list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockMerchants[activeMarketTab].map((m) => (
            <div 
              key={m.id}
              className="bg-zinc-900/30 border border-zinc-850 p-6 rounded-[2rem] hover:border-orange-500/30 transition-all flex flex-col justify-between hover:shadow-2xl relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
              
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
                      {m.name}
                      {m.recommended && (
                        <span className="text-[8px] bg-orange-600/20 text-orange-400 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
                          Recommended
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase italic">
                      {m.orders} Trades • {m.completion} Completion
                    </span>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                    <ShieldCheck className="w-4.5 h-4.5 text-orange-500" />
                  </div>
                </div>

                {/* Price block */}
                <div className="space-y-1 mb-6">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black italic">Conversion Rate</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white italic">{m.rate.toFixed(2)}</span>
                    <span className="text-sm text-zinc-400 font-black uppercase italic">ETB / USDT</span>
                  </div>
                </div>

                {/* Limits & Payment Systems */}
                <div className="space-y-4 pt-4 border-t border-zinc-900/80 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-semibold">Trading Limits</span>
                    <span className="text-white font-extrabold italic">{m.limits}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-semibold">Payment Networks</span>
                    <div className="flex gap-1.5">
                      {m.systems.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-orange-400 rounded text-[9px] font-black italic uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade CTA */}
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className={`w-full py-3.5 rounded-xl font-black uppercase italic text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${activeMarketTab === 'BUY' ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white'}`}
              >
                {activeMarketTab === 'BUY' ? 'Buy USDT' : 'Sell USDT'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* HOW P2P WORKS TUTORIAL */}
      <section id="how-it-works" className="py-24 bg-zinc-950/20 border-t border-zinc-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <span className="text-xs text-orange-500 font-black uppercase tracking-wider italic">AUTOMATED TRADING</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase italic">How Your Trade Is Protected</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto font-medium">
              We eliminate peer-to-peer risks by acting as an objective, programmatically structured third party holding funds securely until both trade counterparties settle up.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Steps line connector background */}
            <div className="hidden md:block absolute top-[68px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-orange-600/5 via-orange-500/40 to-orange-600/5 z-0"></div>

            {[
              { 
                step: '01', 
                title: 'Open Trade', 
                desc: 'Select your preferred exchange rate, input trade quantities, and activate local payment channels with a secure verified merchant.' 
              },
              { 
                step: '02', 
                title: 'Funds lock', 
                desc: 'The seller\'s USDT is instantly locked inside the secure escrow system, preventing double spending or escape.' 
              },
              { 
                step: '03', 
                title: 'Pay local seller', 
                desc: 'Transfer ETB directly to the merchant\'s account via Telebirr or bank transfer. Upload digital receipt images easily as proof.' 
              },
              { 
                step: '04', 
                title: 'USDT Release', 
                desc: 'As soon as the merchant verifies receipt of the ETB, the locked USDT digital assets are released directly inside your Zemenex wallet.' 
              }
            ].map((s, idx) => (
              <div key={idx} className="bg-zinc-905/30 border border-zinc-900 p-6 rounded-3xl relative z-10 flex flex-col justify-between min-h-[250px] group hover:border-orange-500/30 transition-all">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-black text-orange-500 italic font-mono">{s.step}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-md shadow-orange-500 animate-pulse"></span>
                  </div>
                  <h3 className="font-extrabold text-white uppercase text-sm tracking-tight italic">{s.title}</h3>
                  <p className="text-zinc-500 text-xs font-semibold leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TUTORIAL / VIDEOS LEARNING RETREAT */}
      <section id="learn" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left information Column */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs text-orange-500 font-black uppercase tracking-wider italic">Easy guides</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase italic leading-tight">
              Zemenex in Minutes
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-semibold leading-relaxed">
              New to peer-to-peer trading? Feel supported through step-by-step visual training modules detailing secure operations and profile configuration.
            </p>

            {/* Selector list */}
            <div className="space-y-2.5 pt-4">
              {tutorialTabs.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveLearnTab(idx);
                    setIsLearnPlayerActive(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${activeLearnTab === idx ? 'bg-orange-600/15 border-orange-500/30 text-white' : 'bg-transparent border-zinc-900 text-zinc-500 hover:border-zinc-800'}`}
                >
                  <span className="font-bold text-xs uppercase tracking-wide italic">{idx + 1}. {t.title}</span>
                  <div className={`p-1 rounded-md ${activeLearnTab === idx ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                    <Play className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Video Mock Player Column */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-90 w-full rounded-[2.5rem] border border-zinc-850 p-4 sm:p-6 bg-zinc-900/30 relative overflow-hidden backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] text-zinc-500 uppercase font-black italic">Training Module</span>
                <span className="text-[9px] bg-orange-600/20 text-orange-400 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                  LEARN PLATFORM
                </span>
              </div>

              {/* Player Area */}
              <div className="aspect-video bg-black rounded-2xl border border-zinc-850 relative overflow-hidden flex items-center justify-center">
                {isLearnPlayerActive ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={tutorialTabs[activeLearnTab].videoUrl} 
                    title={tutorialTabs[activeLearnTab].title}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  ></iframe>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-transparent z-10 flex flex-col justify-end p-6">
                      <h4 className="text-xl font-black text-white italic uppercase mb-1">{tutorialTabs[activeLearnTab].title}</h4>
                      <p className="text-zinc-400 text-xs font-semibold max-w-md leading-relaxed mb-4">{tutorialTabs[activeLearnTab].desc}</p>
                      
                      {/* Interactive lists bullets */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                        {tutorialTabs[activeLearnTab].benefits.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span className="text-[9px] text-zinc-300 font-black uppercase italic tracking-wide">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Centered Play overlay button */}
                    <button 
                      onClick={() => setIsLearnPlayerActive(true)}
                      className="w-20 h-20 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-2xl hover:bg-orange-500 hover:scale-105 transition-all z-20 group"
                    >
                      <Play className="w-7 h-7 text-white ml-1 fill-white group-hover:scale-110 transition-transform" />
                    </button>
                    
                    {/* Dark gradient blur banner asset */}
                    <div className="absolute inset-0 bg-orange-600/10 rounded-2xl pointer-events-none scale-90 blur-xl"></div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECURITY / TRUST SECTION */}
      <section id="trust" className="py-24 bg-zinc-950/40 border-t border-zinc-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <span className="text-xs text-orange-500 font-black uppercase tracking-wider italic">Trade with Trust</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase italic">Protection for Every Trade</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto font-medium">
              We understand security is your primary blocker. Zemenex implements rigid cryptographic custody guidelines paired with direct human supervision rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/20 border border-zinc-900 hover:border-orange-500/30 p-8 rounded-[2rem] transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="bg-orange-600/10 p-4 rounded-2xl border border-orange-500/20 w-max text-orange-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase italic tracking-wide">Escrow custody</h3>
                <p className="text-zinc-500 text-xs sm:text-sm font-semibold leading-relaxed">
                  Every user trading asset is programmatically isolated inside our custody ledger, locking liquidity securely before communication or fiat transfers launch.
                </p>
              </div>
              <span className="text-[10px] text-orange-500 font-black uppercase italic tracking-wider">CRYPTOGRAPHIC GUARANTEE</span>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-900 hover:border-orange-500/30 p-8 rounded-[2rem] transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="bg-orange-600/10 p-4 rounded-2xl border border-orange-500/20 w-max text-orange-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase italic tracking-wide">Verified Merchants</h3>
                <p className="text-zinc-500 text-xs sm:text-sm font-semibold leading-relaxed">
                  Merchants undergo thorough bank authorization audits and address reviews. No anonymous accounts are ever permitted to trade in bulk inside Zemenex.
                </p>
              </div>
              <span className="text-[10px] text-orange-500 font-black uppercase italic tracking-wider">RIGID AUTHENTICATION</span>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-900 hover:border-orange-500/30 p-8 rounded-[2rem] transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="bg-orange-600/10 p-4 rounded-2xl border border-orange-500/20 w-max text-orange-400">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase italic tracking-wide">24/7 desk support</h3>
                <p className="text-zinc-500 text-xs sm:text-sm font-semibold leading-relaxed">
                  We maintain a highly responsive operator dashboard. In any dispute scenario, administrators check transaction details and release locked funds fairly.
                </p>
              </div>
              <span className="text-[10px] text-orange-500 font-black uppercase italic tracking-wider">DISPUTE SETTLEMENT TIMELINE</span>
            </div>
          </div>
        </div>
      </section>


      {/* MOBILE EXPERIENCE PROMOTION */}
      <section className="py-24 bg-zinc-950/20 border-t border-zinc-900/60 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[200px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Mobile Description */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="text-xs text-orange-500 font-black uppercase tracking-wider italic">MOBILE-FIRST ARCHITECTURE</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase italic leading-tight">
              Trade Anywhere, Anytime
            </h2>
            <p className="text-zinc-400 text-sm md:text-base font-semibold max-w-2xl leading-relaxed">
              Smooth P2P trading on phones and tablets.
            </p>

            <div className="pt-4 flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="bg-zinc-900/50 border border-zinc-850 py-3 px-5 rounded-2xl flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <span className="text-[10px] text-zinc-550 block font-black uppercase italic tracking-wide">Fully Optimized For</span>
                  <span className="text-xs text-white font-extrabold uppercase italic tracking-wide">Android & iOS Safari</span>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-850 py-3 px-5 rounded-2xl flex items-center gap-3">
                <Zap className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <span className="text-[10px] text-zinc-550 block font-black uppercase italic tracking-wide">Interface Response</span>
                  <span className="text-xs text-white font-extrabold uppercase italic tracking-wide">Reactive Touch Gestures</span>
                </div>
              </div>
            </div>
          </div>

          {/* Isometric Mobile Screenshot Mock */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-orange-600/10 blur-2xl rounded-full scale-95 pointer-events-none"></div>
            
            <div className="relative w-64 sm:w-72 aspect-[9/19.5] bg-black rounded-[3rem] border-[8px] border-zinc-850 p-3 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              {/* Phone ear piece */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-850 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-zinc-650 rounded-full mb-1"></div>
              </div>

              {/* Mock App Interface layout */}
              <div className="relative z-10 flex flex-col justify-between h-full pt-6 pb-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-white italic uppercase tracking-wider">ZEMENEX APP</span>
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  </div>

                  {/* Mock Wallet Balance widget */}
                  <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl text-left">
                    <span className="text-[8px] text-zinc-500 uppercase font-black italic">Avail balance</span>
                    <p className="text-lg font-black text-white italic">4,520.50 USDT</p>
                  </div>

                  {/* Mock Order tracker with visual status */}
                  <div className="bg-zinc-950/80 border border-zinc-900 p-3 rounded-2xl text-left space-y-2">
                    <span className="text-[8px] text-orange-500 uppercase font-black italic">Active swap escrow</span>
                    <div className="flex justify-between text-[10px] text-zinc-300 font-bold">
                      <span>Order #792...</span>
                      <span className="text-orange-400">PENDING PAY </span>
                    </div>
                    {/* Linear slider timeline */}
                    <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                      <div className="w-2/3 h-full bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-[8px] text-zinc-550 leading-relaxed font-bold block uppercase tracking-wide">
                    ESCR-AG 1.0 SECURE PIPELINE
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faqs" className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs text-orange-500 font-black uppercase tracking-wider italic">HAVE QUESTIONS ON ESCROW?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase italic">Frequently Asked Questions</h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
            Got specific questions about multi-sig escrow logic, mobile wallet confirmation processes, or dispute arbitration timers? Check our index below.
          </p>
        </div>

        {/* Dynamic Accordions */}
        <div className="space-y-4">
          {[
            { 
              q: 'What is P2P crypto trading and how does it function?', 
              a: 'P2P (Peer-to-Peer) trading allows buyers and sellers to swap crypto (USDT) directly in exchange for local fiat (ETB) with zero middlemen boundaries. Zemenex operates as an unbiased, automated escrow engine holding digital assets securely suspended until real bank transactions settle up.' 
            },
            { 
              q: 'How does the multi-sig Escrow safeguard my assets?', 
              a: 'When an order is locked, Zemenex programmatically locks the seller\'s USDT inside our escrow database. The buyer then transfers local bank funds directly (Telebirr, CBE, etc.) to the seller. Once verified by the seller, escrow releases digital funds. Assets can never oversell or leave without authorization.' 
            },
            { 
              q: 'How long do standard trades and payouts take?', 
              a: 'Over 95% of Zemenex peer swaps settle in under 10 minutes from launch. Speed is primarily defined by how fast local bank payments are verified and how promptly trade counterparties confirm incoming local bank balance records.' 
            },
            { 
              q: 'Which Ethiopian banks and mobile wallets can I execute?', 
              a: 'We support all major Ethiopian financial channels, including Commercial Bank of Ethiopia (CBE), Telebirr (Mobile Wallet), CBE Birr Wallet, Bank of Abyssinia, Awash Bank, and Dashen Bank. New settlement pipelines are continuously authorized.' 
            },
            { 
              q: 'What happens during a transaction dispute?', 
              a: 'If a buyer uploads payment proofs but the seller fails to release locked digital cryptos, either participant can click the "Dispute" button. Our 24/7 compliance desk will verify receipts and bank record screenshots, then programmatically distribute the locked escrow to the lawful claimant.' 
            }
          ].map((faq, idx) => (
            <div 
              key={idx}
              className="bg-zinc-900/35 border border-zinc-850 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-6 py-5 flex justify-between items-center text-left font-black text-xs sm:text-sm text-white uppercase italic tracking-tight hover:bg-zinc-850/30 transition-all"
              >
                <span>{faq.q}</span>
                {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>
              
              <AnimatePresence>
                {openFaqIndex === idx && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-zinc-400 text-xs leading-relaxed border-t border-zinc-950 pt-4 font-semibold">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="bg-zinc-950 border-t border-zinc-90 w-full pt-20 pb-12 px-4 sm:px-6 lg:px-8 mt-12 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-16">
          {/* Top segment with final Call To Action card */}
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl p-8 sm:p-12 text-center lg:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-orange-600/5 rounded-3xl pointer-events-none scale-95 blur-xl"></div>
            
            <div className="lg:col-span-8 space-y-4 relative z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-white italic uppercase leading-none">
                Join Today
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-semibold max-w-2xl">
                Create a secure account via your Google credentials inside Zemenex to immediately check competitive rates and deposit US-Dollar digital assets.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row gap-4 relative z-10 lg:justify-end">
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase italic tracking-wider shadow-lg shadow-orange-600/20"
              >
                Start Trading Now
              </button>
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3.5 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-white font-bold text-xs uppercase italic tracking-wider"
              >
                Access Login Secure
              </button>
            </div>
          </div>

          {/* Middle Navigation grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 justify-center md:justify-start">
                <div className="bg-orange-600 p-2 rounded-xl">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-white uppercase italic tracking-tighter">
                  Zemene<span className="text-orange-500">x</span>
                </span>
              </div>
              <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
                The leading peer-to-peer crypto fintech standard specifically designed for swift, secure local bank transfers and mobile wallet matching inside Ethiopia.
              </p>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest italic block">Platform Links</span>
              <ul className="text-xs space-y-2.5 font-bold text-zinc-455">
                <li><button onClick={() => scrollToSection('home')} className="hover:text-white transition-colors text-zinc-400">Home Interface</button></li>
                <li><button onClick={() => scrollToSection('preview')} className="hover:text-white transition-colors text-zinc-400">P2P Live Tickers</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors text-zinc-400">Escrow Guidelines</button></li>
                <li><button onClick={() => scrollToSection('learn')} className="hover:text-white transition-colors text-zinc-400">Training Modules</button></li>
              </ul>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest italic block">Support Desk</span>
              <ul className="text-xs space-y-2.5 font-bold">
                <li><button onClick={() => scrollToSection('faqs')} className="hover:text-white transition-colors text-zinc-400">Platform FAQ Hub</button></li>
                <li><span className="text-zinc-400 font-bold block">24/7 Arbitrage Active</span></li>
                <li><a href="https://t.me/Zemen_P2P_Support" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-orange-500 flex items-center justify-center md:justify-start gap-1">Telegram Support Chanel <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>

            <div className="space-y-4 text-xs font-semibold text-zinc-400">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest italic block">Contact Details</span>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                <a href="mailto:zmenex.support@gmail.com" className="hover:text-white transition-colors text-zinc-400">zmenex.support@gmail.com</a>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                <span>+251 713834228</span>
              </div>
              <div className="flex gap-4 pt-2 text-zinc-500 justify-center md:justify-start">
                <a href="https://www.instagram.com/zemenexchange/" className="hover:text-white text-orange-500 font-black">Instagram</a>
                <a href="https://web.facebook.com/people/Zemenex/61589670447478/?ref=PROFILE_EDIT_xav_ig_profile_page_web" className="hover:text-white text-orange-500 font-black">Facebook</a>
              </div>
            </div>
          </div>

          {/* Bottom attribution rules */}
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center text-[10px] text-zinc-650 font-bold uppercase tracking-wider text-center md:text-left gap-4">
            <p>© 2026 Zemenex Crypto P2P Services. Licensed Escrow Agent Custody Systems. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#!" className="hover:text-white">Terms of Custody</a>
              <a href="#!" className="hover:text-white">AML Policy</a>
              <a href="#!" className="hover:text-white">Privacy Safeguards</a>
            </div>
          </div>
        </div>
      </footer>

      {/* POPUP MODAL SECURE ACCESS WITH THE SENSITIVE GOOGLE CONTAINER VISUALS */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm transition-all duration-300 ${isLoginModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0" onClick={() => setIsLoginModalOpen(false)}></div>
        
        <motion.div 
          animate={isLoginModalOpen ? { scale: 1, y: 0 } : { scale: 0.9, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-zinc-900 border border-zinc-850 p-6 sm:p-8 rounded-[2.5rem] w-full max-w-md relative z-10 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Top orange glow bubble inside modal */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-600/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Close button */}
          <button 
            onClick={() => setIsLoginModalOpen(false)}
            className="absolute top-5 right-5 p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 mt-2 relative z-10">
            <div className="bg-gradient-to-tr from-zinc-90 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-zinc-900 border border-zinc-800 shadow-xl">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-xl font-black text-white italic uppercase mb-2">Secure Trading Portal</h3>
            <p className="text-zinc-500 text-xs leading-relaxed font-semibold max-w-sm mx-auto">
              Please authenticate your session with physical Google credentials to instantly create your Zemenex custody wallet.
            </p>
          </div>

          {/* Google SSO Render Area */}
          <div className="bg-black/40 border border-zinc-850 p-6 rounded-3xl relative z-10 mb-6 backdrop-blur-md">
            {/* The Google Sign-In script will initialize and render in this div via ref */}
            <div className="flex justify-center" ref={googleBtnRef}></div>
            
            <p className="text-[9px] text-zinc-500 mt-4 leading-normal uppercase tracking-widest font-extrabold italic">
              AUTHORIZED AND SHIELDED ENVIRONMENT
            </p>
          </div>

          <p className="text-[10px] text-zinc-650 leading-relaxed font-bold max-w-xs mx-auto uppercase tracking-wide">
            By connecting, you consent to our Multi-sig Custody Guidelines and automated dispute policies.
          </p>
        </motion.div>
      </div>

    </div>
  );
};
