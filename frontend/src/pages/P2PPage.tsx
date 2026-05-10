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
  Info
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
  merchant: {
    businessName: string;
    phoneNumber: string; 
    bio: string;
    user: { name: string };
  };
}

interface P2POrder {
  id: string;
  adId: string;
  type: 'BUY' | 'SELL';
  amountUsdt: number;
  amountEtb: number;
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  paymentMethod?: string;
  paymentProof?: string;
  createdAt: string;
  merchant: {
    businessName: string;
    phoneNumber: string;
    userId: string;
  };
  creatorId: string;
}

export const P2PPage = () => {
  const { user, checkAuth } = useAuthStore();
  const [ads, setAds] = useState<Ad[]>([]);
  const [type, setType] = useState<'SELL' | 'BUY'>('SELL');
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  
  const [showTradeModal, setShowTradeModal] = useState<Ad | null>(null);
  const [tradeAmount, setTradeAmount] = useState({ usdt: '', etb: '' });
  const [selectedPayment, setSelectedPayment] = useState('Telebirr');
  const [proofFile, setProofFile] = useState<string | null>(null);
  
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
    maxLimit: ''
  });

  useEffect(() => {
    fetchAds();
    fetchAdminRates();
    if (view === 'orders') fetchOrders();
    if (user?.merchant?.status === 'APPROVED') fetchMyAds();
  }, [type, view, user?.merchant?.status]);

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

    try {
      if (editingAd) {
        await axios.put(`/api/p2p/ads/${editingAd.id}`, adForm);
        alert('Ad updated successfully!');
      } else {
        await axios.post('/api/p2p/ads', adForm);
        alert('Ad created successfully!');
      }
      setShowAdModal(false);
      setEditingAd(null);
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
      maxLimit: ad.maxLimit.toString()
    });
    setShowAdModal(true);
  };

  const fetchAds = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/p2p/ads');
      setAds(res.data.filter((ad: Ad) => ad.type === type));
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
      await axios.post(`/api/p2p/orders/${orderId}/paid`, {
        paymentProof: proofFile
      });
      alert('Order marked as paid! Waiting for seller release.');
      fetchOrders();
      setProofFile(null);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFile(reader.result as string);
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
                  ads.map((ad) => (
                    <motion.div 
                      key={ad.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900/40 border border-zinc-800/60 p-6 rounded-3xl hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-orange-500 italic text-xl border border-zinc-800">
                             {ad.merchant.businessName.charAt(0)}
                           </div>
                           <div>
                             <h4 className="text-white font-black italic uppercase tracking-tight flex items-center gap-2">
                               {ad.merchant.businessName}
                               <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-1.5 py-0.5 rounded border border-emerald-500/20">VERIFIED</span>
                             </h4>
                             <p className="text-zinc-500 text-xs font-medium">98.5% Completion • 12min Avg</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 w-full md:w-auto">
                           <div>
                             <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 italic">Price</p>
                             <h5 className="text-xl font-black text-white italic tracking-tighter leading-none">{ad.price} <span className="text-[10px] text-zinc-500">ETB</span></h5>
                           </div>
                           <div>
                             <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 italic">Available</p>
                             <h5 className="text-sm font-black text-zinc-300 italic tracking-tight">{ad.remainingAmount.toFixed(2)} USDT</h5>
                             <p className="text-[10px] text-zinc-500 font-mono italic">Limits: {ad.minLimit}-{ad.maxLimit} ETB</p>
                           </div>
                           <div className="col-span-2 lg:col-span-1 flex items-center">
                             <button 
                                onClick={() => setShowTradeModal(ad)}
                                className={`w-full lg:w-40 py-3 rounded-xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-2 ${
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
                    </motion.div>
                  ))
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
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic border ${
                         order.status === 'COMPLETED' ? 'border-emerald-500/50 text-emerald-500' : 
                         order.status === 'DISPUTED' ? 'border-rose-500/50 text-rose-500' :
                         'border-orange-500/50 text-orange-500'
                      }`}>
                         {order.status}
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
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                       <span className="text-[10px] text-zinc-500 uppercase font-black italic">Method</span>
                                       <span className="text-white font-black italic">{order.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                       <span className="text-[10px] text-zinc-500 uppercase font-black italic">Name</span>
                                       <span className="text-white font-black italic">{order.merchant.businessName}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800">
                                       <span className="text-[10px] text-zinc-500 uppercase font-black italic">Account ID</span>
                                       <span className="text-orange-500 font-black italic text-lg">{order.merchant.phoneNumber}</span>
                                    </div>
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
                                            <img src={proofFile} alt="Proof" className="w-20 h-20 object-cover rounded-lg mx-auto border border-zinc-800 mt-2" />
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
                               <button onClick={() => handleCancelOrder(order.id)} className="text-[10px] font-black text-zinc-600 uppercase italic hover:text-rose-500 transition-colors">Cancel Trade</button>
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
                               </div>

                               {order.paymentProof && (
                                  <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase italic mb-2 tracking-widest">Payment Proof Submission</p>
                                     <img 
                                       src={order.paymentProof} 
                                       alt="Proof" 
                                       className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                                       onClick={() => window.open(order.paymentProof, '_blank')}
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
      {showTradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-lg">
              <h2 className="text-2xl font-black text-white italic uppercase mb-6">Trade with {showTradeModal.merchant.businessName}</h2>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Pay ETB" value={tradeAmount.etb} onChange={(e) => handleTradeAmountChange(e.target.value, 'etb', showTradeModal.price)} className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-orange-500" />
                    <input type="number" placeholder="Receive USDT" value={tradeAmount.usdt} onChange={(e) => handleTradeAmountChange(e.target.value, 'usdt', showTradeModal.price)} className="bg-black border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-emerald-500" />
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {['Telebirr', 'CBE Bank'].map(m => (
                       <button key={m} onClick={() => setSelectedPayment(m)} className={`py-3 rounded-xl border text-[10px] font-black uppercase italic ${selectedPayment === m ? 'bg-orange-600 border-orange-500 text-white' : 'bg-black border-zinc-800 text-zinc-500'}`}>{m}</button>
                    ))}
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowTradeModal(null)} className="flex-1 py-4 text-zinc-500 uppercase italic font-bold">Cancel</button>
                    <button onClick={handleCreateOrder} disabled={!tradeAmount.usdt} className="flex-1 py-4 bg-white text-black font-black rounded-2xl uppercase italic">Continue</button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}

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
                 <input placeholder="Business Name" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white" />
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
