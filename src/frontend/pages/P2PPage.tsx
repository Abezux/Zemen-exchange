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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ad {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  minLimit: number;
  maxLimit: number;
  price: number;
  merchant: {
    businessName: string;
    user: { name: string };
  };
}

export const P2PPage = () => {
  const { user, checkAuth } = useAuthStore();
  const [ads, setAds] = useState<Ad[]>([]);
  const [type, setType] = useState<'SELL' | 'BUY'>('SELL');
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState<Ad | null>(null);
  const [orderAmount, setOrderAmount] = useState('');
  
  const [merchantForm, setMerchantForm] = useState({
    businessName: '',
    phoneNumber: '',
    bio: ''
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [view, setView] = useState<'market' | 'orders'>('market');

  useEffect(() => {
    fetchAds();
    if (view === 'orders') fetchOrders();
    if (user?.merchant?.status === 'APPROVED') fetchMyAds();
  }, [type, view, user?.merchant?.status]);

  const fetchMyAds = async () => {
    try {
      const res = await axios.get('/api/p2p/my-ads');
      setMyAds(res.data);
    } catch (error) {}
  };

  const [myAds, setMyAds] = useState<any[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adForm, setAdForm] = useState({
    type: 'SELL',
    amount: '',
    price: '',
    minLimit: '',
    maxLimit: ''
  });

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/p2p/ads', adForm);
      alert('Ad created successfully!');
      setShowAdModal(false);
      fetchMyAds();
      fetchAds();
    } catch (error) {
      alert('Failed to create ad');
    }
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
      const res = await axios.get('/api/transactions'); // We'll need a specialized P2P order tab or endpoint
      // For now let's just assume we'll use a new endpoint I'll create
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

  const handleCreateOrder = async () => {
    if (!showOrderModal || !orderAmount) return;
    try {
      await axios.post('/api/p2p/orders', {
        adId: showOrderModal.id,
        amountUsdt: parseFloat(orderAmount)
      });
      alert('Order created! Please proceed with payment.');
      setShowOrderModal(null);
      setOrderAmount('');
      setView('orders');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create order');
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      await axios.post(`/api/p2p/orders/${orderId}/paid`);
      fetchOrders();
    } catch (error) {
       alert('Failed to mark as paid');
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
        <>
          {/* Header section with Stats/Intro */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-orange-500" />
                <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">P2P Marketplace</h1>
              </div>
              <p className="text-zinc-500 text-sm max-w-lg mb-8 leading-relaxed">
                Trade USDT directly with verified merchants. Low rates, zero fees, and secure escrow protection for every transaction.
              </p>
              
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
            <div className="absolute -right-8 -bottom-8 opacity-5 text-9xl font-black italic select-none">PEER</div>
          </div>

          {/* Ads List */}
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
                             <h5 className="text-sm font-black text-zinc-300 italic tracking-tight">{ad.amount.toFixed(2)} USDT</h5>
                             <p className="text-[10px] text-zinc-500 font-mono italic">Limits: {ad.minLimit}-{ad.maxLimit} ETB</p>
                           </div>
                           <div className="col-span-2 lg:col-span-1 flex items-center">
                             <button 
                               onClick={() => setShowOrderModal(ad)}
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
                     <div className="bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                        <AlertCircle className="w-6 h-6 text-zinc-700" />
                     </div>
                     <div>
                        <h3 className="text-white font-black italic uppercase tracking-tight">No Active Offers</h3>
                        <p className="text-zinc-500 text-xs mt-1">Check back later or change the trade type.</p>
                     </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <motion.div 
               key={order.id}
               className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl"
            >
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${order.type === 'SELL' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {order.type === 'SELL' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                     </div>
                     <div>
                        <p className="text-zinc-500 text-[10px] font-black uppercase italic">Order #{order.id.slice(-6)}</p>
                        <h4 className="text-white font-black italic uppercase">{order.type === 'SELL' ? 'Buying' : 'Selling'} USDT</h4>
                     </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic border ${
                    order.status === 'COMPLETED' ? 'border-emerald-500/20 text-emerald-500' : 'border-orange-500/20 text-orange-500'
                  }`}>
                    {order.status}
                  </span>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                     <p className="text-zinc-500 text-[10px] uppercase font-black mb-1">Amount</p>
                     <p className="text-white font-black italic">{order.amountUsdt} USDT</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                     <p className="text-zinc-500 text-[10px] uppercase font-black mb-1">Total ETB</p>
                     <p className="text-white font-black italic">{order.amountEtb} ETB</p>
                  </div>
               </div>

               {order.status === 'PENDING' && (
                  <button 
                    onClick={() => handleMarkPaid(order.id)}
                    className="w-full bg-orange-600 text-white font-black py-3 rounded-xl uppercase italic tracking-tight"
                  >
                    I Have Paid (Send ETB)
                  </button>
               )}
               {order.status === 'PAID' && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-center">
                    <p className="text-emerald-500 text-xs font-bold uppercase italic">Awaiting Confirmation / Release</p>
                    {/* If user is the one releasing (Seller) */}
                    {((order.type === 'BUY' && order.creatorId === user?.id) || (order.type === 'SELL' && order.merchant.userId === user?.id)) && (
                       <button onClick={() => handleRelease(order.id)} className="mt-4 w-full bg-emerald-600 text-white font-black py-3 rounded-xl uppercase italic">
                         Confirm & Release USDT
                       </button>
                    )}
                  </div>
               )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Merchant Dashboard (Only for approved merchants) */}
      {user?.merchant?.status === 'APPROVED' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-6">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Briefcase className="w-6 h-6 text-orange-500" />
                 <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">My Merchant Desk</h2>
              </div>
              <button 
                onClick={() => setShowAdModal(true)}
                className="bg-white text-black font-black px-6 py-2 rounded-xl text-xs uppercase italic tracking-tight flex items-center gap-2 hover:bg-zinc-100 transition-all"
              >
                <Plus className="w-4 h-4" /> Create Ad
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAds.map(ad => (
                <div key={ad.id} className="bg-black/40 border border-zinc-800 p-4 rounded-2xl relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded italic border ${ad.type === 'SELL' ? 'border-orange-500/20 text-orange-500' : 'border-emerald-500/20 text-emerald-500'}`}>
                         {ad.type} AD
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold italic">{ad.price} ETB</span>
                   </div>
                   <div className="space-y-1">
                      <p className="text-white font-black italic">{ad.amount.toFixed(2)} USDT</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-black italic tracking-widest">{ad.minLimit}-{ad.maxLimit} ETB Limits</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Create Ad Modal (only for approved merchants) */}
      {showAdModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md shadow-2xl shadow-orange-600/10"
           >
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-5 h-5 text-orange-500" />
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Post P2P Advertisement</h2>
              </div>
              <form onSubmit={handleCreateAd} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setAdForm({...adForm, type: 'SELL'})}
                      className={`py-3 rounded-xl font-black uppercase italic text-xs transition-all ${adForm.type === 'SELL' ? 'bg-orange-600 text-white shadow-lg' : 'bg-black text-zinc-600 border border-zinc-800'}`}
                    >
                      Sell USDT
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAdForm({...adForm, type: 'BUY'})}
                      className={`py-3 rounded-xl font-black uppercase italic text-xs transition-all ${adForm.type === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-black text-zinc-600 border border-zinc-800'}`}
                    >
                      Buy USDT
                    </button>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest">Initial Inventory (USDT)</label>
                    <input 
                      required type="number" step="0.01"
                      value={adForm.amount}
                      onChange={e => setAdForm({...adForm, amount: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic focus:border-orange-600 outline-none transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest">Rate (ETB per 1 USDT)</label>
                    <input 
                      required type="number" step="0.1"
                      value={adForm.price}
                      onChange={e => setAdForm({...adForm, price: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic focus:border-orange-600 outline-none transition-all"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest">Min Order (ETB)</label>
                       <input 
                         required type="number"
                         value={adForm.minLimit}
                         onChange={e => setAdForm({...adForm, minLimit: e.target.value})}
                         className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase italic tracking-widest">Max Order (ETB)</label>
                       <input 
                         required type="number"
                         value={adForm.maxLimit}
                         onChange={e => setAdForm({...adForm, maxLimit: e.target.value})}
                         className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic"
                       />
                    </div>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowAdModal(false)} className="flex-1 py-4 text-zinc-500 font-bold uppercase italic tracking-tight border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all">Discard</button>
                    <button type="submit" className="flex-1 py-4 bg-white text-black font-black uppercase italic tracking-tight rounded-2xl hover:bg-zinc-100 transition-all shadow-xl shadow-white/5">Publish Ad</button>
                 </div>
              </form>
           </motion.div>
        </div>
      )}

      {/* Become a Merchant Banner */}
      {!user?.merchant && (
        <motion.div 
          onClick={() => setShowApplyModal(true)}
          whileHover={{ scale: 1.01 }}
          className="bg-orange-600 p-8 rounded-[2rem] shadow-xl shadow-orange-600/10 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer"
        >
           <div className="flex items-center gap-6 text-center md:text-left">
              <div className="bg-white/20 p-4 rounded-2xl">
                 <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Earn as a Merchant</h3>
                 <p className="text-orange-100 text-sm font-medium mt-1">Post your own ads and start trading professionally.</p>
              </div>
           </div>
           <button className="bg-white text-orange-600 font-black px-8 py-4 rounded-2xl uppercase italic tracking-tight hover:bg-zinc-100 transition-all flex items-center gap-2 whitespace-nowrap">
             Apply Now <ArrowRight className="w-4 h-4" />
           </button>
        </motion.div>
      )}

      {/* Pending status banner */}
      {user?.merchant?.status === 'PENDING' && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] flex items-center gap-6">
           <div className="bg-orange-500/10 p-4 rounded-2xl">
              <Clock className="w-8 h-8 text-orange-500" />
           </div>
           <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Merchant Approval Pending</h3>
              <p className="text-zinc-500 text-sm font-medium mt-1">Our team is reviewing your application. This usually takes 2-4 hours.</p>
           </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md"
           >
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-6">Merchant Application</h2>
              <form onSubmit={handleApplyMerchant} className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic">Business Name</label>
                    <input 
                      required
                      value={merchantForm.businessName}
                      onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic">Payment Method Info (Telebirr/Bank No.)</label>
                    <input 
                      required
                      value={merchantForm.phoneNumber}
                      onChange={e => setMerchantForm({...merchantForm, phoneNumber: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic">Short Bio</label>
                    <textarea 
                      value={merchantForm.bio}
                      onChange={e => setMerchantForm({...merchantForm, bio: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold italic h-24"
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 py-4 text-zinc-400 font-bold uppercase italic border border-zinc-800 rounded-2xl">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-white text-black font-black uppercase italic rounded-2xl">Submit</button>
                 </div>
              </form>
           </motion.div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md"
           >
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Trade with {showOrderModal.merchant.businessName}</h2>
              <p className="text-zinc-500 text-xs mb-8 italic">Rate: <span className="text-white font-bold">{showOrderModal.price} ETB/USDT</span></p>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic">Amount to {type === 'SELL' ? 'Buy' : 'Sell'} (USDT)</label>
                    <input 
                      type="number"
                      value={orderAmount}
                      onChange={e => setOrderAmount(e.target.value)}
                      placeholder={`Max ${showOrderModal.amount}`}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-xl font-black italic"
                    />
                    {orderAmount && (
                      <p className="text-[10px] text-zinc-500 italic font-mono">You will {type === 'SELL' ? 'pay' : 'receive'} <span className="text-white font-bold">{(parseFloat(orderAmount) * showOrderModal.price).toLocaleString()} ETB</span></p>
                    )}
                 </div>

                 <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex items-center gap-3">
                       <ShieldCheck className="w-5 h-5 text-orange-500" />
                       <span className="text-xs font-black text-white uppercase italic">Escrow Protected</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                      Funds are held in a secure vault until both parties confirm fulfillment. Your security is our priority.
                    </p>
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => setShowOrderModal(null)} className="flex-1 py-4 text-zinc-400 font-bold uppercase italic border border-zinc-800 rounded-2xl">Cancel</button>
                    <button 
                      onClick={handleCreateOrder}
                      className={`flex-1 py-4 font-black uppercase italic rounded-2xl ${type === 'SELL' ? 'bg-emerald-600' : 'bg-white text-black'}`}
                    >
                      Process Trade
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

