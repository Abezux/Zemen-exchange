import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore.ts';
import { 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  Briefcase,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
  Timer,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Copy,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ad {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  remainingAmount: number;
  minLimit: number;
  maxLimit: number;
  price: number;
  paymentMethods?: string;
  merchant: {
    businessName: string;
    phoneNumber: string; 
    bio: string;
    user: { 
      name: string;
      verificationStatus?: string;
    };
  };
}

interface P2POrder {
  id: string;
  adId: string;
  type: 'BUY' | 'SELL';
  amountUsdt: number;
  amountEtb: number;
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'EXPIRED';
  paymentMethod?: string;
  paymentProof?: string;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  releasedAt?: string;
  cancelledAt?: string;
  disputedAt?: string;
  merchant: {
    businessName: string;
    phoneNumber: string;
    userId: string;
  };
  creatorId: string;
}

export const P2PTimer = ({ order, onTimeout }: { order: P2POrder; onTimeout: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [phase, setPhase] = useState<'phase1' | 'phase2' | 'finished'>('phase1');

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      if (order.status === 'PENDING') {
        if (!order.expiresAt) return { time: 0, phase: 'finished' as const };
        const expiry = new Date(order.expiresAt).getTime();
        const diff = Math.max(0, expiry - now);
        return { time: diff, phase: 'phase1' as const };
      } else if (order.status === 'PAID') {
        if (!order.paidAt) return { time: 0, phase: 'finished' as const };
        const paidTime = new Date(order.paidAt).getTime();
        const expiry = paidTime + 15 * 60 * 1000;
        const diff = Math.max(0, expiry - now);
        return { time: diff, phase: 'phase2' as const };
      }
      return { time: 0, phase: 'finished' as const };
    };

    const initial = calculateTime();
    setTimeLeft(initial.time);
    setPhase(initial.phase);

    if (initial.phase === 'finished') return;

    const interval = setInterval(() => {
      const current = calculateTime();
      setTimeLeft(current.time);
      setPhase(current.phase);

      if (current.phase === 'finished') {
        clearInterval(interval);
      }
      if (order.status === 'PENDING' && current.time === 0) {
        clearInterval(interval);
        onTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order.status, order.expiresAt, order.paidAt, onTimeout]);

  if (phase === 'finished') {
    if (order.status === 'COMPLETED') {
      return (
        <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-xl font-black uppercase italic tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> ESCROW RELEASED
        </div>
      );
    }
    if (order.status === 'CANCELLED') {
      return (
        <div className="flex items-center gap-1.5 text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1.5 rounded-xl font-black uppercase italic tracking-wider">
          <AlertCircle className="w-3.5 h-3.5" /> TRADE CANCELLED
        </div>
      );
    }
    if (order.status === 'EXPIRED') {
      return (
        <div className="flex items-center gap-1.5 text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 rounded-xl font-black uppercase italic tracking-wider">
          <Clock className="w-3.5 h-3.5" /> ORDER EXPIRED
        </div>
      );
    }
    if (order.status === 'DISPUTED') {
      return (
        <div className="flex items-center gap-1.5 text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1.5 rounded-xl font-black uppercase italic tracking-wider">
          <Info className="w-3.5 h-3.5 animate-pulse" /> UNDER DISPUTE
        </div>
      );
    }
    return null;
  }

  const minutes = Math.floor(timeLeft / 1000 / 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (phase === 'phase1') {
    return (
      <div className={`flex items-center gap-2 text-[10px] px-3.5 py-2 rounded-xl font-black uppercase italic tracking-widest ${minutes < 3 ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 animate-pulse' : 'bg-orange-500/10 border border-orange-500/20 text-orange-500'}`}>
        <Timer className="w-4 h-4" />
        PAY WINDOW: {timerString}
      </div>
    );
  }

  if (phase === 'phase2') {
    if (timeLeft === 0) {
      return (
        <div className="flex flex-col gap-1 text-right">
          <div className="text-[10px] font-black text-rose-500 uppercase italic flex items-center gap-1 justify-end animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> RELEASE OVERDUE
          </div>
          <span className="text-[8px] text-zinc-500 italic">Seller exceeded 15m window.</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3.5 py-2 rounded-xl font-black uppercase italic tracking-widest">
        <Timer className="w-4 h-4 animate-spin-slow" />
        RELEASE WINDOW: {timerString}
      </div>
    );
  }

  return null;
};

export const P2PPage = () => {
  const { user, checkAuth } = useAuthStore();
  const [ads, setAds] = useState<Ad[]>([]);
  const [type, setType] = useState<'SELL' | 'BUY'>('SELL');
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Dynamic Filtering Hook States
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [selectedPmFilter, setSelectedPmFilter] = useState('');
  const [sortBy, setSortBy] = useState('best_match');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [userEnabledPMs, setUserEnabledPMs] = useState<any[]>([]);
  const [adPaymentMethods, setAdPaymentMethods] = useState<string[]>([]);

  const [showTradeModal, setShowTradeModal] = useState<Ad | null>(null);
  const [tradeAmount, setTradeAmount] = useState({ usdt: '', etb: '' });
  const [selectedPayment, setSelectedPayment] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const getPaymentMethodLabel = (code: string) => {
    const key = code.trim().toUpperCase();
    switch (key) {
      case 'CBE': return 'Commercial Bank of Ethiopia (CBE)';
      case 'TELEBIRR': return 'Telebirr (Mobile Wallet)';
      case 'ABYSSINIA': return 'Bank of Abyssinia (BoA)';
      case 'DASHEN': return 'Dashen Bank';
      case 'AWASH': return 'Awash Bank';
      case 'CBE BIRR': return 'CBE Birr Wallet';
      default: return code;
    }
  };
  
  const [merchantForm, setMerchantForm] = useState({
    businessName: '',
    phoneNumber: '',
    bio: ''
  });

  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [view, setView] = useState<'market' | 'orders'>('market');
  const [orderFilter, setOrderFilter] = useState<'ACTIVE' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'>('ACTIVE');
  const [myAds, setMyAds] = useState<any[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [adminRates, setAdminRates] = useState({ buyRate: 120, sellRate: 115 });
  const [adForm, setAdForm] = useState({
    type: 'SELL',
    amount: '',
    price: '',
    minLimit: '',
    maxLimit: '',
    adDisplayName: ''
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getRecipientPaymentDetails = (ord: P2POrder) => {
    // If order is to buy, creator is buyer and merchant is seller (recipient)
    // If order is to sell, creator is seller (recipient) and merchant is buyer
    const isMerchantPaying = ord.type === 'BUY'; // Merchant is buying, so merchant pays ETB
    
    if (isMerchantPaying) {
      // Creator is receiving, look up creator's userPaymentMethod
      const bank = ord.paymentMethod?.toUpperCase();
      const pm = ord.creator?.paymentMethods?.find((p: any) => p.bankName.toUpperCase() === bank);
      if (pm) {
        return {
          bankName: pm.bankName,
          accountName: pm.accountName,
          accountNumber: pm.accountNumber
        };
      }
      return {
        bankName: ord.paymentMethod,
        accountName: ord.creator?.name || 'User Account',
        accountNumber: 'No account details found'
      };
    } else {
      // Merchant is receiving, look up merchant's user's payment method
      const bank = ord.paymentMethod?.toUpperCase();
      const pm = ord.merchant?.user?.paymentMethods?.find((p: any) => p.bankName.toUpperCase() === bank);
      if (pm) {
        return {
          bankName: pm.bankName,
          accountName: pm.accountName,
          accountNumber: pm.accountNumber
        };
      }
      return {
         bankName: ord.paymentMethod,
         accountName: ord.merchant?.user?.name || ord.merchant?.businessName || 'Merchant Account',
         accountNumber: ord.merchant?.phoneNumber || 'No account details found'
      };
    }
  };

  const fetchUserPMs = async () => {
    try {
      const res = await axios.get('/api/user/payment-methods');
      setUserEnabledPMs(res.data.filter((pm: any) => pm.isEnabled));
    } catch (e) {
      console.error("Failed to load user payments", e);
    }
  };

  useEffect(() => {
    fetchAds();
    fetchAdminRates();
    fetchUserPMs();
    if (view === 'orders') fetchOrders();
    if (user?.merchant?.status === 'APPROVED') fetchMyAds();
  }, [type, view, user?.merchant?.status, minPrice, maxPrice, amountFilter, selectedPmFilter, sortBy, verifiedOnly]);

  const fetchAdminRates = async () => {
    try {
      const res = await axios.get('/api/admin/settings');
      setAdminRates(res.data);
    } catch (error) {
      console.error("Failed to fetch admin rates");
    }
  };

  const fetchMyAds = async () => {
    try {
      const res = await axios.get('/api/p2p/my-ads');
      setMyAds(res.data);
    } catch (error) {}
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(adForm.amount);
    const numPrice = parseFloat(adForm.price);
    const numMinLimit = parseFloat(adForm.minLimit);

    // Frontend Validations
    if (!editingAd && adForm.type === 'SELL' && numAmount > (user?.wallet?.balance || 0)) {
      return alert('Insufficient wallet balance to sell this amount.');
    }
    if (numMinLimit < 500) {
      return alert('Minimum order amount must be at least 500 ETB.');
    }
    if (numMinLimit >= (numAmount * numPrice)) {
      return alert('Min limit cannot exceed total ad value.');
    }

    const userPMBankNames = userEnabledPMs.map((m: any) => m.bankName.trim().toUpperCase());
    for (const pm of adPaymentMethods) {
      if (!userPMBankNames.includes(pm.trim().toUpperCase())) {
        return alert("Add this payment method to your profile to continue");
      }
    }

    try {
      const payload = {
        ...adForm,
        paymentMethods: adPaymentMethods
      };

      if (editingAd) {
        await axios.put(`/api/p2p/ads/${editingAd.id}`, payload);
        alert('Ad updated successfully!');
      } else {
        await axios.post('/api/p2p/ads', payload);
        alert('Ad created successfully!');
      }
      setShowAdModal(false);
      setEditingAd(null);
      setAdPaymentMethods([]);
      setAdForm({
        type: 'SELL',
        amount: '',
        price: '',
        minLimit: '',
        maxLimit: '',
        adDisplayName: ''
      });
      checkAuth(); // Refresh wallet balance
      fetchMyAds();
      fetchAds();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save ad');
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad? Remaining USDT will be returned to your balance.')) return;
    try {
      await axios.delete(`/api/p2p/ads/${id}`);
      fetchMyAds();
      fetchAds();
      checkAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete ad');
    }
  };

  const openEditModal = (ad: any) => {
    setEditingAd(ad);
    setAdForm({
      type: ad.type,
      amount: ad.amount.toString(),
      price: ad.price.toString(),
      minLimit: ad.minLimit.toString(),
      maxLimit: ad.maxLimit.toString(),
      adDisplayName: ad.adDisplayName || ''
    });
    setAdPaymentMethods(ad.paymentMethods ? ad.paymentMethods.split(",") : []);
    setShowAdModal(true);
  };

  const fetchAds = async () => {
    try {
      setIsLoading(true);
      const payload = {
        type,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        amount: amountFilter || undefined,
        paymentMethods: selectedPmFilter || undefined,
        sortBy,
        verifiedOnly: verifiedOnly ? 'true' : undefined
      };
      const res = await axios.post('/api/p2p/ads/search', payload);
      setAds(res.data);
    } catch (error) {
      console.error("Fetch ads error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const p2pRes = await axios.get('/api/p2p/orders');
      setOrders(p2pRes.data);
    } catch (error) {}
  };

  const handleApplyMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/p2p/merchant/apply', merchantForm);
      alert('Application submitted! Pending admin approval.');
      setShowApplyModal(false);
      checkAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit application');
    }
  };

  const handleTradeAmountChange = (val: string, field: 'usdt' | 'etb', price: number) => {
    if (field === 'usdt') {
      const etbValue = val ? (parseFloat(val) * price).toFixed(2) : '';
      setTradeAmount({ usdt: val, etb: etbValue });
    } else {
      const usdtValue = val ? (parseFloat(val) / price).toFixed(4) : '';
      setTradeAmount({ etb: val, usdt: usdtValue });
    }
  };

  const handleCreateOrder = async () => {
    if (!showTradeModal || !tradeAmount.usdt) return;
    try {
      // Use Trade Ad ID + Timestamp for idempotency
      const idempotencyKey = `order-${showTradeModal.id}-${Date.now()}`;
      await axios.post('/api/p2p/orders', {
        adId: showTradeModal.id,
        amountUsdt: parseFloat(tradeAmount.usdt),
        paymentMethod: selectedPayment,
        idempotencyKey
      });
      setShowTradeModal(null);
      setTradeAmount({ usdt: '', etb: '' });
      setView('orders');
      fetchOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create order');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.post(`/api/p2p/orders/${orderId}/cancel`);
      fetchOrders();
      checkAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel order');
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      const formData = new FormData();
      if (proofFile) {
        formData.append('proof', proofFile);
      }
      
      await axios.post(`/api/p2p/orders/${orderId}/paid`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Order marked as paid! Waiting for seller release.');
      fetchOrders();
      setProofFile(null);
      setProofPreview(null);
    } catch (error) {
       alert('Failed to mark as paid');
    }
  };

  const handleDispute = async (orderId: string) => {
    const reason = prompt('Reason for dispute:');
    if (!reason) return;
    try {
      await axios.post(`/api/p2p/orders/${orderId}/dispute`, { reason });
      alert('Dispute opened. Support will review.');
      fetchOrders();
    } catch (error) {
       alert('Failed to open dispute');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRelease = async (orderId: string) => {
    if(!confirm('Are you sure you have received the ETB and want to release USDT?')) return;
    try {
      await axios.post(`/api/p2p/orders/${orderId}/release`);
      fetchOrders();
      checkAuth();
    } catch (error) {
       alert('Failed to release funds');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-zinc-800">
        <button 
          onClick={() => setView('market')} 
          className={`pb-4 px-2 text-xs font-black uppercase italic tracking-widest transition-all ${view === 'market' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500'}`}
        >
          Marketplace
        </button>
        <button 
          onClick={() => setView('orders')} 
          className={`pb-4 px-2 text-xs font-black uppercase italic tracking-widest transition-all ${view === 'orders' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500'}`}
        >
          Active Trades
        </button>
      </div>

      {view === 'market' ? (
        <div className="space-y-8">
          {/* Header section with Stats/Intro */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} key={type}>
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-orange-500" />
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">P2P Marketplace</h1>
                  </div>
                  <p className="text-zinc-500 text-sm max-w-lg mb-8 leading-relaxed">
                    Trade USDT directly with verified merchants. Low rates, zero fees, and secure escrow protection for every transaction.
                  </p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setType('SELL')}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-2 ${
                    type === 'SELL' 
                      ? 'bg-white text-black scale-105 shadow-xl shadow-white/10' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <ArrowDownLeft className="w-5 h-5" /> Buy USDT
                </button>
                <button 
                  onClick={() => setType('BUY')}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-2 ${
                    type === 'BUY' 
                      ? 'bg-orange-600 text-white scale-105 shadow-xl shadow-orange-600/20' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5" /> Sell USDT
                </button>
              </div>
            </div>
          </div>
          
          {/* Advanced P2P Matching & Search Filter Bar */}
          {/* Desktop Filter Layout */}
          <div className="hidden lg:block bg-zinc-950 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Search & Compatibility Filter Engine</h3>
              </div>
              <button 
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setAmountFilter('');
                  setSelectedPmFilter('');
                  setSortBy('best_match');
                  setVerifiedOnly(false);
                }}
                className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase font-bold"
              >
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-6 gap-4 text-xs">
              {/* Payment Method Selector */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-zinc-500 font-bold block">Payment Option</label>
                <select 
                  value={selectedPmFilter}
                  onChange={(e) => setSelectedPmFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-orange-500"
                >
                  <option value="">All payment options</option>
                  <option value="CBE">CBE (Commercial Bank)</option>
                  <option value="TELEBIRR">Telebirr Wallet</option>
                  <option value="ABYSSINIA">Bank of Abyssinia</option>
                  <option value="DASHEN">Dashen Bank</option>
                  <option value="AWASH">Awash Bank</option>
                  <option value="CBE BIRR">CBE Birr Wallet</option>
                </select>
              </div>

              {/* Trade Size target (fiat limit verification) */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-zinc-500 font-bold block">Fiat Amount (ETB)</label>
                <input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Min Price Limit */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-zinc-500 font-bold block">Min Price (ETB)</label>
                <input 
                  type="number"
                  placeholder="Min Rate"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Max Price Limit */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-zinc-500 font-bold block">Max Price (ETB)</label>
                <input 
                  type="number"
                  placeholder="Max Rate"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Rank/Sort Multi-tier Logic */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-zinc-500 font-bold block">Rank By</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-orange-500"
                >
                  <option value="best_match">☆ Best Match (Scored)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="liquidity_desc">Largest Liquidity</option>
                </select>
              </div>

              {/* Verified Badge and checkboxes */}
              <div className="flex items-center gap-2 h-full pt-5 col-span-1">
                <input 
                  type="checkbox"
                  id="verifiedOnlyCheckbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-zinc-900 border-zinc-800 rounded focus:ring-orange-500"
                />
                <label htmlFor="verifiedOnlyCheckbox" className="text-zinc-400 font-bold select-none cursor-pointer">
                  Verified Trust only
                </label>
              </div>
            </div>
          </div>

          {/* Mobile Filter Trigger Row */}
          <div className="lg:hidden bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black text-white uppercase italic tracking-wider">P2P Match Filter</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-tight flex items-center gap-1.5 shadow-md shadow-orange-600/10"
              >
                <span>Filter Ad Board</span>
                {((minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (amountFilter ? 1 : 0) + (selectedPmFilter ? 1 : 0) + (sortBy !== 'best_match' ? 1 : 0) + (verifiedOnly ? 1 : 0)) > 0 && (
                  <span className="bg-white text-orange-600 w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px] leading-none shrink-0">
                    {((minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (amountFilter ? 1 : 0) + (selectedPmFilter ? 1 : 0) + (sortBy !== 'best_match' ? 1 : 0) + (verifiedOnly ? 1 : 0))}
                  </span>
                )}
              </button>
              
              {((minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (amountFilter ? 1 : 0) + (selectedPmFilter ? 1 : 0) + (sortBy !== 'best_match' ? 1 : 0) + (verifiedOnly ? 1 : 0)) > 0 && (
                <button
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setAmountFilter('');
                    setSelectedPmFilter('');
                    setSortBy('best_match');
                    setVerifiedOnly(false);
                  }}
                  className="bg-zinc-850 hover:bg-zinc-800 text-zinc-400 font-bold px-3 py-2 rounded-xl text-[10px] uppercase"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mobile bottom-drawer sheet for filter panel */}
          <AnimatePresence>
            {isMobileFilterOpen && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm lg:hidden">
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={() => setIsMobileFilterOpen(false)} />
                
                {/* Drawer Body */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="relative z-10 w-full bg-zinc-950 border-t border-zinc-800 rounded-t-[2rem] p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[85vh] font-sans text-xs"
                >
                  {/* Top bar drag indicator visual */}
                  <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto" onClick={() => setIsMobileFilterOpen(false)} />
                  
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900 mt-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-orange-500" />
                      <h4 className="text-sm font-black text-white uppercase italic">Active Board Filtering</h4>
                    </div>
                    <button
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="p-1.5 bg-zinc-900 border border-zinc-850 rounded-xl"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>

                  {/* Payment option */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider block text-[9px]">Payment Option</label>
                    <select 
                      value={selectedPmFilter}
                      onChange={(e) => setSelectedPmFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-orange-500 text-sm"
                    >
                      <option value="">All payment options</option>
                      <option value="CBE">CBE (Commercial Bank)</option>
                      <option value="TELEBIRR">Telebirr Wallet</option>
                      <option value="ABYSSINIA">Bank of Abyssinia</option>
                      <option value="DASHEN">Dashen Bank</option>
                      <option value="AWASH">Awash Bank</option>
                      <option value="CBE BIRR">CBE Birr Wallet</option>
                    </select>
                  </div>

                  {/* Amount etb */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider block text-[9px]">Fiat Amount (ETB)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5000"
                      value={amountFilter}
                      onChange={(e) => setAmountFilter(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>

                  {/* Min Limit / Max Limit rates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-zinc-500 font-bold uppercase tracking-wider block text-[9px]">Min Price (ETB)</label>
                      <input 
                        type="number"
                        placeholder="Min Rate"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-zinc-500 font-bold uppercase tracking-wider block text-[9px]">Max Price (ETB)</label>
                      <input 
                        type="number"
                        placeholder="Max Rate"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Sort By options */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider block text-[9px]">Rank By</label>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-orange-500 text-sm"
                    >
                      <option value="best_match">☆ Best Match (Scored)</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="liquidity_desc">Largest Liquidity</option>
                    </select>
                  </div>

                  {/* Trust selection checkbox */}
                  <div className="flex items-center gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 select-none">
                    <input 
                      type="checkbox"
                      id="verifiedOnlyCheckboxMobile"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="w-4 h-4 text-orange-600 bg-zinc-900 border-zinc-800 rounded focus:ring-orange-500 shrink-0"
                    />
                    <label htmlFor="verifiedOnlyCheckboxMobile" className="text-zinc-400 font-bold cursor-pointer uppercase text-[10px] tracking-wide block w-full py-1">
                      Show Verified Trust Brokers Only
                    </label>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setAmountFilter('');
                        setSelectedPmFilter('');
                        setSortBy('best_match');
                        setVerifiedOnly(false);
                        setIsMobileFilterOpen(false);
                      }}
                      className="flex-1 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl font-bold uppercase"
                    >
                      Reset All
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="flex-1 py-3.5 bg-orange-600 text-white rounded-xl font-black uppercase italic shadow-lg shadow-orange-600/10"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Marketplace Content */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest italic flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Active {type === 'SELL' ? 'SELL' : 'BUY'} Offers
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-zinc-900/50 animate-pulse rounded-3xl border border-zinc-800"></div>
                  ))
                ) : ads.length > 0 ? (
                  ads.map((ad) => {
                    const adMethods = ad.paymentMethods ? ad.paymentMethods.split(",").map(p => p.trim().toUpperCase()) : [];
                    const userMethods = userEnabledPMs.map(m => m.bankName.trim().toUpperCase());
                    const matchedMethods = adMethods.filter(method => userMethods.includes(method));
                    const hasMatchedMethod = matchedMethods.length > 0;
                    const isMerchantVerified = ad.merchant.user.verificationStatus === "verified";                     return (
                      <motion.div 
                        key={ad.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all group ${
                          hasMatchedMethod 
                            ? 'bg-orange-950/10 border-orange-500/20 hover:border-orange-500/40 shadow-md shadow-orange-950/5' 
                            : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                          <div className="flex items-center gap-3 sm:gap-4">
                             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-orange-500 italic text-lg sm:text-xl border border-zinc-800">
                               {(ad.adDisplayName || ad.merchant.businessName).charAt(0)}
                             </div>
                             <div>
                               <h4 className="text-sm sm:text-base text-white font-black italic uppercase tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
                                 <span>{ad.adDisplayName || ad.merchant.businessName}</span>
                                 {isMerchantVerified ? (
                                   <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-extrabold uppercase tracking-wide leading-none">
                                     ✓ Verified Broker
                                   </span>
                                 ) : (
                                   <span className="bg-zinc-900 text-zinc-500 text-[8px] px-1.5 py-0.5 rounded border border-zinc-850 leading-none">
                                     Standard Member
                                   </span>
                                 )}
                               </h4>
                               <p className="text-zinc-500 text-[10px] sm:text-xs font-semibold">98.5% Completion • 12min Avg</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full lg:w-auto">
                             <div>
                               <p className="text-[9px] sm:text-[10px] font-bold text-zinc-650 uppercase tracking-widest mb-0.5 italic">Price</p>
                               <h5 className="text-lg sm:text-xl font-black text-white italic tracking-tighter leading-none">{ad.price} <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wide">ETB</span></h5>
                             </div>
                             <div>
                               <p className="text-[9px] sm:text-[10px] font-bold text-zinc-650 uppercase tracking-widest mb-0.5 italic">Available</p>
                               <h5 className="text-xs sm:text-sm font-black text-zinc-350 italic tracking-tight">{ad.remainingAmount.toFixed(2)} USDT</h5>
                               <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono italic">Limits: {ad.minLimit}-{ad.maxLimit} ETB</p>
                             </div>
                             <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex items-center pt-1 sm:pt-0">
                               <button 
                                  onClick={() => {
                                     setShowTradeModal(ad);
                                     const adMethods = ad.paymentMethods ? ad.paymentMethods.split(',').map((p: any) => p.trim().toUpperCase()).filter(Boolean) : [];
                                     const merchantMethods = ad.merchant?.user?.paymentMethods ? ad.merchant.user.paymentMethods.filter((pm: any) => pm.isEnabled).map((pm: any) => pm.bankName.trim().toUpperCase()) : [];
                                     const intersection = adMethods.filter((m: any) => merchantMethods.includes(m));
                                     setSelectedPayment(intersection[0] || '');
                                  }}
                                  className={`w-full lg:w-40 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-2 text-xs sm:text-sm ${
                                    type === 'SELL' 
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/10' 
                                      : 'bg-white text-black hover:bg-zinc-200'
                                  }`}
                                >
                                  {type === 'SELL' ? 'Buy USDT' : 'Sell USDT'}
                                </button>
                             </div>
                          </div>
                        </div>

                        {/* Payment Options Row */}
                        <div className="mt-4 pt-3 border-t border-zinc-900/40 flex flex-wrap items-center gap-2 select-none">
                          <span className="text-[9px] sm:text-[10px] text-zinc-550 uppercase font-black italic mr-1">Settlement Channels:</span>
                          {adMethods.length === 0 ? (
                            <span className="text-[9px] text-zinc-600 font-semibold">Seller did not specify option</span>
                          ) : (
                            adMethods.map((method, index) => {
                              const isMatched = userMethods.includes(method);
                              return (
                                <span 
                                  key={index} 
                                  className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wide border ${
                                    isMatched 
                                      ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30 font-extrabold' 
                                      : 'bg-zinc-850/60 text-zinc-500 border-zinc-850'
                                  }`}
                                >
                                  {isMatched ? '✓ ' : ''}{method}
                                </span>
                              );
                            })
                          )}

                          {hasMatchedMethod && (
                            <div className="ml-auto text-emerald-400 font-black italic uppercase tracking-wider text-[8px] sm:text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 animate-pulse select-none">
                              <Sparkles className="w-2.5 h-2.5" /> MATCHED FOR YOU
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-20 text-center space-y-4">
                     <AlertCircle className="w-12 h-12 text-zinc-800 mx-auto" />
                     <h3 className="text-white font-black italic uppercase tracking-tight">No Active Offers</h3>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all ${
                  orderFilter === f ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            {orders
              .filter(o => {
                if (orderFilter === 'ACTIVE') return o.status === 'PENDING' || o.status === 'PAID';
                if (orderFilter === 'PENDING') return o.status === 'PENDING';
                if (orderFilter === 'CANCELLED') return o.status === 'CANCELLED' || o.status === 'EXPIRED';
                return o.status === orderFilter;
              })
              .map(order => {
              const isCreator = order.creatorId === user?.id; // The person who clicked "Buy/Sell" on the ad
              const isMerchant = order.merchant.userId === user?.id; // The ad owner
              
              // Define roles: Buyer vs Seller
              // Ad type SELL: Merchant is Seller, Creator is Buyer
              // Ad type BUY: Merchant is Buyer, Creator is Seller
              const isBuyer = (order.type === 'SELL' && isCreator) || (order.type === 'BUY' && isMerchant);
              const isSeller = (order.type === 'SELL' && isMerchant) || (order.type === 'BUY' && isCreator);

              return (
                <motion.div 
                   key={order.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-2xl space-y-6"
                >
                   <div className="flex justify-between items-center pb-6 border-b border-zinc-800/50">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                            order.status === 'DISPUTED' ? 'bg-rose-500/10 text-rose-500' :
                            order.status === 'EXPIRED' ? 'bg-red-500/10 text-red-500' :
                            'bg-orange-500/10 text-orange-500'
                         }`}>
                            {order.status === 'COMPLETED' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6 animate-pulse" />}
                         </div>
                         <div>
                            <p className="text-zinc-500 text-[10px] font-black uppercase italic tracking-[0.2em] mb-1">Order #{order.id.slice(-6)}</p>
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                               {isBuyer ? 'Buying' : 'Selling'} USDT
                            </h3>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <P2PTimer order={order} onTimeout={fetchOrders} />
                         <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic border ${
                            order.status === 'COMPLETED' ? 'border-emerald-500/50 text-emerald-500' : 
                            order.status === 'DISPUTED' ? 'border-rose-500/50 text-rose-500' :
                            order.status === 'EXPIRED' ? 'border-red-500/50 text-red-500' :
                            'border-orange-500/50 text-orange-500'
                         }`}>
                            {order.status}
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
                         <p className="text-[10px] text-zinc-500 font-bold uppercase italic mb-1">Quantity</p>
                         <p className="text-white font-black italic">{order.amountUsdt.toFixed(2)} USDT</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50 col-span-2">
                         <p className="text-[10px] text-orange-500 font-bold uppercase italic mb-1">Total Fiat</p>
                         <p className="text-2xl font-black text-white italic tracking-tighter leading-none">{order.amountEtb.toLocaleString()} ETB</p>
                      </div>
                   </div>

                   {/* ROLE BASED VIEWS */}
                   {order.status === 'PENDING' && (
                      <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                         {isBuyer ? (
                            <>
                              <div className="bg-orange-600/5 border border-orange-500/20 p-6 rounded-3xl space-y-4">
                                 <p className="text-xs font-black text-white uppercase italic tracking-widest text-center">Payment Instructions</p>
                                 <div className="space-y-3">
                                    {(() => {
                                       const pDetails = getRecipientPaymentDetails(order);
                                       return (
                                          <>
                                             <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                                <span className="text-[10px] text-zinc-500 uppercase font-black italic">Bank / Method</span>
                                                <div className="flex items-center gap-2">
                                                   <span className="text-white font-black italic">{pDetails.bankName}</span>
                                                   <button type="button" onClick={() => handleCopyText(pDetails.bankName, `bank-${order.id}`)} className="text-orange-500 hover:text-white transition-colors">
                                                      {copiedField === `bank-${order.id}` ? <span className="text-[9px] text-emerald-500 font-bold">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
                                                   </button>
                                                </div>
                                             </div>
                                             <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                                <span className="text-[10px] text-zinc-500 uppercase font-black italic">Account Holder</span>
                                                <div className="flex items-center gap-2">
                                                   <span className="text-white font-black italic">{pDetails.accountName}</span>
                                                   <button type="button" onClick={() => handleCopyText(pDetails.accountName, `name-${order.id}`)} className="text-orange-500 hover:text-white transition-colors">
                                                      {copiedField === `name-${order.id}` ? <span className="text-[9px] text-emerald-500 font-bold">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
                                                   </button>
                                                </div>
                                             </div>
                                             <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                                <span className="text-[10px] text-zinc-500 uppercase font-black italic">Account Number</span>
                                                <div className="flex items-center gap-2">
                                                   <span className="text-orange-500 font-black italic text-lg">{pDetails.accountNumber}</span>
                                                   <button type="button" onClick={() => handleCopyText(pDetails.accountNumber, `number-${order.id}`)} className="text-orange-500 hover:text-white transition-colors">
                                                      {copiedField === `number-${order.id}` ? <span className="text-[9px] text-emerald-500 font-bold">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
                                                   </button>
                                                </div>
                                             </div>
                                          </>
                                       );
                                    })()}
                                 </div>
                                 <p className="text-[10px] text-zinc-500 text-center italic">Transfer exactly <span className="text-white font-bold">{order.amountEtb} ETB</span> to avoid delays.</p>
                              </div>

                              <div className="space-y-4">
                                 <div className="relative group overflow-hidden bg-black/60 border-2 border-dashed border-zinc-800 rounded-[2rem] p-8 text-center transition-all hover:border-orange-500/50">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={onFileChange} 
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                    />
                                    <div className="space-y-3">
                                       {proofFile ? (
                                         <div className="flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                               <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                            <p className="text-white text-[10px] font-black uppercase italic">Payment Proof Attached</p>
                                            <img src={proofPreview || ''} alt="Proof" className="w-20 h-20 object-cover rounded-lg mx-auto border border-zinc-800 mt-2" />
                                         </div>
                                       ) : (
                                         <div className="flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                                               <ImageIcon className="w-8 h-8 text-zinc-600" />
                                            </div>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase italic tracking-widest">Upload Payment Proof</p>
                                            <p className="text-[8px] text-zinc-600 uppercase font-bold italic tracking-tighter">Drag & Drop or Click (Mobile Friendly)</p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                                 
                                 <div className="flex gap-4">
                                    <button onClick={() => handleCancelOrder(order.id)} className="flex-1 py-4 text-zinc-500 border border-zinc-800 rounded-2xl uppercase italic font-bold">Cancel Trade</button>
                                    <button 
                                      disabled={!proofFile} 
                                      onClick={() => handleMarkPaid(order.id)} 
                                      className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl uppercase italic font-black shadow-xl shadow-orange-600/10 transition-all hover:scale-[1.02] active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600"
                                    >
                                       {proofFile ? "Confirm & Mark Paid" : "Attach Proof to Continue"}
                                    </button>
                                 </div>
                              </div>
                            </>
                         ) : (
                            <div className="bg-zinc-800/50 p-10 rounded-[2rem] text-center space-y-4 border border-dashed border-zinc-800">
                               <Clock className="w-12 h-12 text-zinc-700 mx-auto animate-pulse" />
                               <h4 className="text-white font-black italic uppercase italic tracking-tighter">Waiting for Buyer</h4>
                               <p className="text-zinc-500 text-[10px] max-w-[200px] mx-auto italic">The buyer has been notified and is currently processing the payment.</p>
                            </div>
                         )}
                      </div>
                   )}

                   {order.status === 'PAID' && (
                      <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                         {isSeller ? (
                            <div className="bg-emerald-600/5 border border-emerald-500/20 p-8 rounded-[2rem] space-y-6">
                               <div className="flex flex-col items-center gap-4">
                                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 shadow-lg" />
                                  </div>
                                  <div className="text-center">
                                     <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Payment Received!</h4>
                                     <p className="text-zinc-500 text-[10px] italic mt-1 italic tracking-widest">Verify the receipt in your account before releasing funds.</p>
                                  </div>

                                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 space-y-2">
                                     <p className="text-[10px] text-emerald-500 font-black uppercase italic tracking-widest">Expected Recipient Details</p>
                                     {(() => {
                                        const pDetails = getRecipientPaymentDetails(order);
                                        return (
                                           <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                                                 <p className="text-[8px] text-zinc-500 uppercase text-left">Bank / Method</p>
                                                 <p className="font-bold text-white uppercase text-left">{pDetails.bankName}</p>
                                              </div>
                                              <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                                                 <p className="text-[8px] text-zinc-500 uppercase text-left">Account Holder</p>
                                                 <p className="font-bold text-white text-left">{pDetails.accountName}</p>
                                              </div>
                                              <div className="col-span-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 flex justify-between items-center">
                                                 <div className="text-left">
                                                    <p className="text-[8px] text-zinc-500 uppercase">Account Number</p>
                                                    <p className="font-bold text-emerald-400 text-sm">{pDetails.accountNumber}</p>
                                                 </div>
                                                 <button type="button" onClick={() => handleCopyText(pDetails.accountNumber, `seller-num-${order.id}`)} className="text-zinc-500 hover:text-white transition-colors">
                                                    {copiedField === `seller-num-${order.id}` ? <span className="text-[9px] text-emerald-500 font-bold font-medium mb-1">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
                                                 </button>
                                              </div>
                                           </div>
                                        );
                                     })()}
                                  </div>
                               </div>

                               {order.paymentProof && (
                                  <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase italic mb-2 tracking-widest">Payment Proof Submission</p>
                                     <img 
                                       src={order.paymentProof.startsWith('https') || order.paymentProof.startsWith('data:') ? order.paymentProof : `${axios.defaults.baseURL || ''}${order.paymentProof}`} 
                                       alt="Proof" 
                                       className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                                       onClick={() => {
                                         const url = order.paymentProof?.startsWith('https') || order.paymentProof?.startsWith('data:') ? order.paymentProof : `${axios.defaults.baseURL || ''}${order.paymentProof}`;
                                         window.open(url, '_blank');
                                       }}
                                     />
                                  </div>
                               )}

                               <div className="space-y-3">
                                  <button 
                                    onClick={() => handleRelease(order.id)} 
                                    className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase italic shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                                  >
                                    Release USDT to Buyer
                                  </button>
                                  <button onClick={() => handleDispute(order.id)} className="w-full py-3 text-rose-500 text-[10px] font-black uppercase italic hover:bg-rose-500/10 rounded-xl transition-all">
                                    I Haven't Received Payment (Dispute)
                                  </button>
                               </div>
                            </div>
                         ) : (
                            <div className="text-center py-10 bg-zinc-800/30 rounded-[2rem] border border-zinc-800 flex flex-col items-center space-y-4">
                               <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                                  <Clock className="w-8 h-8 text-blue-500 animate-pulse" />
                                </div>
                               <div>
                                  <h4 className="text-white font-black italic uppercase tracking-tighter">Verification in Progress</h4>
                                  <p className="text-zinc-500 text-[10px] mt-2 italic px-8">The seller is verifying your payment proof. Funds will be released shortly.</p>
                               </div>
                               <button onClick={() => handleDispute(order.id)} className="text-[10px] font-black text-rose-500 uppercase italic hover:underline">Report Order</button>
                            </div>
                         )}
                      </div>
                   )}

                    {order.status === 'CANCELLED' && (
                       <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-rose-500" />
                             </div>
                             <div>
                                <p className="text-rose-500 font-black italic uppercase text-xs">Trade Cancelled</p>
                                <p className="text-zinc-500 text-[8px] italic uppercase tracking-widest">Funds reverted to seller balance</p>
                             </div>
                          </div>
                       </div>
                    )}

                    {order.status === 'EXPIRED' && (
                       <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-red-500" />
                             </div>
                             <div>
                                <p className="text-red-500 font-black italic uppercase text-xs">Payment Window Expired</p>
                                <p className="text-zinc-500 text-[8px] italic uppercase tracking-widest">Auto-refunded to seller lock</p>
                             </div>
                          </div>
                       </div>
                    )}

                    {order.status === 'DISPUTED' && (
                       <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-3xl space-y-3">
                          <div className="flex items-center gap-4 pb-3 border-b border-zinc-900">
                             <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                <Info className="w-6 h-6 text-orange-500 animate-pulse" />
                             </div>
                             <div>
                                <p className="text-orange-500 font-black italic uppercase text-xs">Under Admin Dispute</p>
                                <p className="text-zinc-500 text-[8px] italic uppercase tracking-widest">Zemen Desk evaluating payment proofs</p>
                             </div>
                          </div>
                          {order.disputeReason && (
                             <p className="text-[10px] text-zinc-400 italic font-medium">"Reason: {order.disputeReason}"</p>
                          )}
                       </div>
                    )}

                   {order.status === 'COMPLETED' && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                               <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                               <p className="text-emerald-500 font-black italic uppercase text-xs">Transaction Successful</p>
                               <p className="text-zinc-500 text-[8px] italic uppercase tracking-widest">{order.amountUsdt.toFixed(2)} USDT Exchanged</p>
                            </div>
                         </div>
                         <ExternalLink className="w-4 h-4 text-zinc-700" />
                      </div>
                   )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Merchant Section */}
      {user?.merchant?.status === 'APPROVED' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Merchant Desk</h2>
              <button onClick={() => { setEditingAd(null); setAdForm({ type: 'SELL', amount: '', price: '', minLimit: '', maxLimit: '' }); setShowAdModal(true); }} className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black uppercase italic tracking-tight">Create Ad</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myAds.map(ad => (
                <div key={ad.id} className="bg-black/40 border border-zinc-800 p-6 rounded-[2rem] space-y-4">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest leading-none mb-1">{ad.type} AD</p>
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase italic ${
                            ad.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            ad.status === 'EXPIRED' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                         }`}>{ad.status}</span>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => openEditModal(ad)}
                           disabled={ad.status === 'DELETED'}
                           className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-30"
                         >
                            <Plus className="w-3 h-3 text-zinc-400 rotate-45" />
                         </button>
                         <button 
                           onClick={() => handleDeleteAd(ad.id)}
                           disabled={ad.status === 'DELETED'}
                           className="p-2 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-colors disabled:opacity-30"
                         >
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                         </button>
                      </div>
                   </div>
                   
                   <div className="space-y-1">
                      <p className="text-white font-black italic text-lg leading-tight">{ad.remainingAmount.toFixed(2)} <span className="text-[10px] text-zinc-500">/ {ad.amount.toFixed(2)} USDT</span></p>
                      <p className="text-zinc-500 text-[10px] font-medium italic">Rate: <span className="text-white">{ad.price} ETB</span></p>
                   </div>

                   <div className="pt-2 border-t border-zinc-800/50">
                      <p className="text-[8px] text-zinc-600 font-bold uppercase italic tracking-widest">Limits: {ad.minLimit} - {ad.maxLimit} ETB</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Modals */}
      {showTradeModal && (() => {
         const adMethods = showTradeModal.paymentMethods 
           ? showTradeModal.paymentMethods.split(',').map((p: any) => p.trim().toUpperCase()).filter(Boolean)
           : [];
         const merchantMethods = showTradeModal.merchant?.user?.paymentMethods
           ? showTradeModal.merchant.user.paymentMethods.filter((pm: any) => pm.isEnabled).map((pm: any) => pm.bankName.trim().toUpperCase())
           : [];
         const validIntersection = adMethods.filter((method: any) => merchantMethods.includes(method));

         return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
               <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-lg">
                  <h2 className="text-2xl font-black text-white italic uppercase mb-6">Trade with {showTradeModal.merchant.businessName}</h2>
                  <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Pay ETB" value={tradeAmount.etb} onChange={(e) => handleTradeAmountChange(e.target.value, 'etb', showTradeModal.price)} className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-orange-500" />
                        <input type="number" placeholder="Receive USDT" value={tradeAmount.usdt} onChange={(e) => handleTradeAmountChange(e.target.value, 'usdt', showTradeModal.price)} className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic block mb-1">Select Payment Settlement Method</label>
                        {validIntersection.length === 0 ? (
                           <div className="p-3 bg-red-955/20 border border-red-900/40 text-red-500 font-bold text-center rounded-xl text-xs">
                              No matching enabled payment methods found between this ad and the merchant's profile.
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 gap-2">
                              {validIntersection.map((m: string) => (
                                 <button 
                                    key={m} 
                                    type="button"
                                    onClick={() => setSelectedPayment(m)} 
                                    className={`py-3 px-2 rounded-xl border text-[10px] font-black uppercase italic tracking-tight transition-all text-center flex items-center justify-center ${selectedPayment === m ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/10' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                 >
                                    {getPaymentMethodLabel(m)}
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>
                     <div className="flex gap-4">
                        <button onClick={() => setShowTradeModal(null)} className="flex-1 py-4 text-zinc-500 uppercase italic font-bold border border-zinc-800 rounded-xl hover:bg-zinc-800">Cancel</button>
                        <button onClick={handleCreateOrder} disabled={!tradeAmount.usdt || !selectedPayment} className="flex-1 py-4 bg-white text-black font-black rounded-2xl uppercase italic disabled:opacity-30 disabled:cursor-not-allowed">Continue</button>
                     </div>
                  </div>
               </motion.div>
            </div>
         );
      })()}

      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md">
              <form onSubmit={handleCreateAd} className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white italic uppercase">{editingAd ? 'Edit Trade Ad' : 'Post Trade Ad'}</h2>
                    <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-lg">
                       <p className="text-[8px] text-zinc-500 font-black uppercase italic tracking-widest">Your Balance</p>
                       <p className="text-xs font-black text-orange-500 italic">{user?.wallet?.balance?.toFixed(2)} USDT</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!editingAd} onClick={() => setAdForm({...adForm, type: 'SELL'})} className={`py-4 rounded-xl font-black uppercase italic tracking-tight transition-all border ${adForm.type === 'SELL' ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' : 'bg-black border-zinc-800 text-zinc-600'} ${editingAd ? 'opacity-50 cursor-not-allowed' : ''}`}>Sell USDT</button>
                    <button type="button" disabled={!!editingAd} onClick={() => setAdForm({...adForm, type: 'BUY'})} className={`py-4 rounded-xl font-black uppercase italic tracking-tight transition-all border ${adForm.type === 'BUY' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-black border-zinc-800 text-zinc-600'} ${editingAd ? 'opacity-50 cursor-not-allowed' : ''}`}>Buy USDT</button>
                 </div>

                 <div className="space-y-4">
                    <div className="relative group">
                       <label className="absolute left-4 top-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Quantity (USDT)</label>
                       <input 
                         placeholder="0.00" required type="number" step="0.01" 
                         value={adForm.amount} 
                         onChange={e => {
                           const val = e.target.value;
                           const price = parseFloat(adForm.price) || 0;
                           setAdForm({
                             ...adForm, 
                             amount: val,
                             maxLimit: val && price ? (parseFloat(val) * price).toFixed(2) : adForm.maxLimit
                           });
                         }} 
                         className={`w-full bg-black border rounded-xl px-4 pt-6 pb-3 text-white text-lg font-black italic outline-none transition-all ${adForm.type === 'SELL' && parseFloat(adForm.amount) > ((user?.wallet?.balance || 0) + (editingAd?.amount || 0)) ? 'border-rose-500' : 'border-zinc-800 focus:border-orange-500'}`} 
                       />
                       {adForm.type === 'SELL' && parseFloat(adForm.amount) > ((user?.wallet?.balance || 0) + (editingAd?.amount || 0)) && (
                         <p className="text-[8px] text-rose-500 font-bold italic mt-1 ml-4 uppercase">Exceeds available balance</p>
                       )}
                    </div>

                    <div className="relative group">
                       <label className="absolute left-4 top-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest italic leading-none">
                          Price (ETB/USDT) • <span className="text-orange-500">Admin: {adForm.type === 'SELL' ? adminRates.sellRate : adminRates.buyRate}</span>
                       </label>
                       <input 
                         placeholder="0.00" required type="number" step="0.1" 
                         value={adForm.price} 
                         onChange={e => {
                           const val = e.target.value;
                           const amount = parseFloat(adForm.amount) || 0;
                           setAdForm({
                             ...adForm, 
                             price: val,
                             maxLimit: val && amount ? (amount * parseFloat(val)).toFixed(2) : adForm.maxLimit
                           });
                         }} 
                         className="w-full bg-black border border-zinc-800 rounded-xl px-4 pt-6 pb-3 text-white text-lg font-black italic outline-none focus:border-orange-500 transition-all" 
                       />
                       <p className="text-[8px] text-zinc-500 italic mt-1 ml-4 uppercase">Suggested: {(adForm.type === 'SELL' ? adminRates.sellRate : adminRates.buyRate) * 0.98} - {(adForm.type === 'SELL' ? adminRates.sellRate : adminRates.buyRate)}</p>
                     </div>

                     <div className="relative group">
                        <label className="absolute left-4 top-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">P2P Ad Display Name (Optional)</label>
                        <input 
                          placeholder="Leaves empty to use profile name" 
                          type="text" 
                          value={adForm.adDisplayName || ''} 
                          onChange={e => setAdForm({...adForm, adDisplayName: e.target.value})} 
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 pt-6 pb-3 text-white font-black italic text-sm outline-none focus:border-orange-500 transition-all" 
                        />
                        <p className="text-[8px] text-zinc-500 italic mt-1 ml-4 uppercase">Used ONLY on P2P marketplace listings to customize ad title. Orders & official profile views always use your certified full name.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="relative">
                          <label className="absolute left-4 top-2 text-[8px] font-black text-zinc-500 uppercase italic">Min Order (ETB)</label>
                          <input placeholder="500" required type="number" value={adForm.minLimit} onChange={e => setAdForm({...adForm, minLimit: e.target.value})} className="w-full bg-black border border-zinc-800 px-4 pt-6 pb-3 rounded-xl text-white font-black italic text-sm outline-none focus:border-orange-500" />
                       </div>
                       <div className="relative opacity-60">
                           <label className="absolute left-4 top-2 text-[8px] font-black text-zinc-500 uppercase italic">Max Auto (ETB)</label>
                           <input disabled placeholder="0.00" type="number" value={adForm.maxLimit} className="w-full bg-zinc-900 border border-zinc-800 px-4 pt-6 pb-3 rounded-xl text-white font-black italic text-sm" />
                       </div>
                    </div>

                    <div className="space-y-1.5 border-t border-zinc-900 pt-3">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic block mb-1">Accepted Settlement Options</label>
                       <div className="grid grid-cols-2 gap-2 text-xs">
                         {userEnabledPMs.length === 0 ? (
                           <div className="col-span-2 p-3 bg-red-950/20 border border-red-900/40 text-red-500 font-bold text-center rounded-xl text-[10px]">
                             No enabled payment methods found in your profile. Please configure them in Profile settings before publishing ads.
                           </div>
                         ) : (
                           userEnabledPMs.map(pm => {
                             const method = pm.bankName.trim().toUpperCase();
                             const isChecked = adPaymentMethods.map(m => m.trim().toUpperCase()).includes(method);
                             return (
                                <button
                                   key={pm.id}
                                   type="button"
                                   onClick={() => {
                                      if (isChecked) {
                                         setAdPaymentMethods(adPaymentMethods.filter(m => m.trim().toUpperCase() !== method));
                                      } else {
                                         setAdPaymentMethods([...adPaymentMethods, method]);
                                      }
                                   }}
                                   className={`py-2 px-3 rounded-lg border text-[11px] font-bold text-left flex items-center justify-between transition-all ${
                                      isChecked 
                                         ? 'bg-orange-600/10 border-orange-500 text-orange-400' 
                                         : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                   }`}
                                >
                                   <span>{getPaymentMethodLabel(method)}</span>
                                   {isChecked && <span className="text-[10px]">✓</span>}
                                </button>
                             );
                           })
                         )}
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowAdModal(false)} className="flex-1 py-4 text-zinc-500 uppercase italic font-bold border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-white text-black font-black rounded-2xl uppercase italic shadow-xl shadow-white/5 transition-all hover:scale-105 active:scale-95">{editingAd ? 'Update Ad' : 'Publish Ad'}</button>
                 </div>
              </form>
           </motion.div>
        </div>
      )}

      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md">
              <form onSubmit={handleApplyMerchant} className="space-y-4">
                 <h2 className="text-xl font-black text-white italic uppercase">Apply Merchant</h2>
                 <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-black italic">Merchant Display Name</p>
                    <p className="text-white font-black italic">{user?.name || user?.email?.split('@')[0] || 'My Account'}</p>
                    <p className="text-[9px] text-zinc-500 italic">Your merchant name is linked directly to your profile name for consistent and trusted trade certification.</p>
                 </div>
                 <input placeholder="Phone/PaymentID" required value={merchantForm.phoneNumber} onChange={e => setMerchantForm({...merchantForm, phoneNumber: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white" />
                 <textarea placeholder="Bio" value={merchantForm.bio} onChange={e => setMerchantForm({...merchantForm, bio: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white h-24" />
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 py-4 text-zinc-500 uppercase italic font-bold">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-white text-black font-black rounded-2xl uppercase italic">Submit</button>
                 </div>
              </form>
           </motion.div>
        </div>
      )}

      {/* Banner */}
      {!user?.merchant && (
        <div onClick={() => setShowApplyModal(true)} className="bg-orange-600 p-8 rounded-[2rem] cursor-pointer flex justify-between items-center group">
           <div>
              <h3 className="text-xl font-black text-white italic uppercase">Become a Merchant</h3>
              <p className="text-orange-100 text-sm">Post ads and earn from trades.</p>
           </div>
           <ArrowRight className="w-8 h-8 text-white group-hover:translate-x-2 transition-transform" />
        </div>
      )}
    </div>
  );
};
