import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Shield, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Check, 
  X, 
  ExternalLink,
  Search,
  Eye,
  CreditCard,
  Users,
  History,
  Activity,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore.ts';

interface DepositRequest {
  id: string;
  amount: number;
  txHash: string;
  status: string;
  createdAt: string;
  proofImageUrl: string;
  user: {
     email: string;
     name: string;
  }
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  walletAddress: string;
  network: string;
  status: string;
  createdAt: string;
  user: {
     email: string;
     name: string;
  }
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  isFrozen: boolean;
  createdAt: string;
  wallet: { balance: number; lockedBalance: number } | null;
  merchant: { id: string; status: string; businessName: string } | null;
  _count: { depositRequests: number; withdrawalRequests: number; p2pOrders: number };
}

interface P2PAdRecord {
  id: string;
  type: string;
  status: string;
  amount: number;
  remainingAmount: number;
  price: number;
  merchant: { user: { name: string; email: string } };
  createdAt: string;
}

interface P2POrderRecord {
  id: string;
  type: string;
  amountUsdt: number;
  amountEtb: number;
  status: string;
  paymentProof: string | null;
  disputeReason: string | null;
  createdAt: string;
  creator: { name: string; email: string };
  merchant: { user: { name: string; email: string } };
}

interface AuditLog {
  id: string;
  userId: string | null;
  user: { email: string } | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export const AdminPage = () => {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [ads, setAds] = useState<P2PAdRecord[]>([]);
  const [orders, setOrders] = useState<P2POrderRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'users' | 'merchants' | 'ads' | 'orders' | 'logs'>('deposits');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'deposits' || activeTab === 'withdrawals') {
        const [depRes, withRes] = await Promise.all([
          axios.get('/api/admin/deposits'),
          axios.get('/api/admin/withdrawals')
        ]);
        setDeposits(Array.isArray(depRes.data) ? depRes.data : []);
        setWithdrawals(Array.isArray(withRes.data) ? withRes.data : []);
      } else if (activeTab === 'users') {
        const res = await axios.get('/api/admin/users');
        setUsers(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'merchants') {
        const res = await axios.get('/api/admin/merchants');
        setMerchants(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'ads') {
        const res = await axios.get('/api/admin/ads');
        setAds(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'orders') {
        const res = await axios.get('/api/admin/orders');
        setOrders(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'logs') {
        const res = await axios.get('/api/admin/logs');
        setLogs(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      // Ensure we don't have stale/broken data on error
      if (activeTab === 'orders') setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFreeze = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'Unfreeze' : 'Freeze'} this user?`)) return;
    try {
      await axios.post(`/api/admin/users/${userId}/freeze`, { frozen: !currentStatus });
      fetchData();
    } catch (error) {
      alert('Action failed');
    }
  };

  const handleApproveMerchant = async (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') => {
    try {
      await axios.post(`/api/admin/merchants/${id}/approve`, { status });
      fetchData();
    } catch (error) {
      alert('Failed to update merchant status');
    }
  };

  const handleResolveOrder = async (orderId: string, action: 'RELEASE' | 'CANCEL') => {
    if (!confirm(`Admin Override: Are you sure you want to ${action} this order? This action is IRREVERSIBLE.`)) return;
    try {
      await axios.post(`/api/admin/orders/${orderId}/resolve`, { action });
      fetchData();
    } catch (error) {
      alert('Resolution failed');
    }
  };

  const handleVerifyDeposit = async (id: string) => {
    if (!confirm('Verify this deposit and credit user?')) return;
    try {
      await axios.post(`/api/admin/deposits/${id}/verify`);
      fetchData();
    } catch (error) {
      alert('Verification failed');
    }
  };

  const handleRejectDeposit = async (id: string) => {
    if (!confirm('Reject this deposit?')) return;
    try {
      await axios.post(`/api/admin/deposits/${id}/reject`);
      fetchData();
    } catch (error) {
      alert('Rejection failed');
    }
  };

  const handlePayWithdrawal = async (id: string) => {
    if (!confirm('Mark this withdrawal as PAID?')) return;
    try {
      await axios.post(`/api/admin/withdrawals/${id}/pay`);
      fetchData();
    } catch (error) {
      alert('Processing failed');
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    if (!confirm('Reject this withdrawal?')) return;
    try {
      await axios.post(`/api/admin/withdrawals/${id}/reject`);
      fetchData();
    } catch (error) {
      alert('Rejection failed');
    }
  };

  const [rates, setRates] = useState({ buyRate: 120, sellRate: 115 });
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    fetchData();
    if (user?.settings) {
      setRates({ buyRate: user.settings.buyRate, sellRate: user.settings.sellRate });
    }
  }, [user]);

  const handleUpdateRates = async () => {
    try {
      await axios.post('/api/admin/settings', rates);
      await checkAuth(); // refresh global settings in store
      alert('Rates updated successfully');
    } catch (error) {
      alert('Failed to update rates');
    }
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center text-zinc-500 italic uppercase tracking-widest font-black">Admin Access: Initializing Secure Terminal...</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Rate Management Panel */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-bold text-white tracking-tight italic uppercase">Exchange Rate Control</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Buy Rate (ETB/USDT)</label>
            <input 
              type="number"
              value={rates.buyRate}
              onChange={(e) => setRates({ ...rates, buyRate: parseFloat(e.target.value) })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-black italic focus:ring-1 focus:ring-orange-600 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Sell Rate (ETB/USDT)</label>
            <input 
              type="number"
              value={rates.sellRate}
              onChange={(e) => setRates({ ...rates, sellRate: parseFloat(e.target.value) })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-black italic focus:ring-1 focus:ring-orange-600 transition-all outline-none"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleUpdateRates}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl uppercase italic tracking-tight transition-all active:scale-95 shadow-lg shadow-orange-600/20"
            >
              Update Rates
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
           <div className="bg-orange-600 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Admin Terminal</h1>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 overflow-x-auto">
           {(['deposits', 'withdrawals', 'users', 'merchants', 'ads', 'orders', 'logs'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-tight italic transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                {tab === 'deposits' && <ArrowDownCircle className="w-4 h-4" />}
                {tab === 'withdrawals' && <ArrowUpCircle className="w-4 h-4" />}
                {tab === 'users' && <Users className="w-4 h-4" />}
                {tab === 'merchants' && <UserCheck className="w-4 h-4" />}
                {tab === 'orders' && <History className="w-4 h-4" />}
                {tab === 'ads' && <Activity className="w-4 h-4" />}
                {tab === 'logs' && <Activity className="w-4 h-4" />}
                {tab}
              </button>
           ))}
        </div>
      </div>

      <div className="bg-zinc-950 rounded-[2rem] border border-zinc-900 overflow-hidden shadow-2xl overflow-x-auto">
        {activeTab === 'users' ? (
          <table className="w-full text-left">
             <thead>
               <tr className="border-b border-zinc-900 bg-zinc-900/5">
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">User Info</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Balance</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Merchant Status</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {Array.isArray(users) && users.map(u => (
                  <tr key={u.id} className={`border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors ${u.isFrozen ? 'bg-rose-500/5' : ''}`}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {u.isFrozen && <Shield className="w-4 h-4 text-rose-500" />}
                        <div>
                          <p className="text-sm font-bold text-white italic">{u.name || 'No Name'}</p>
                          <p className="text-[10px] text-zinc-500 font-mono italic">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-emerald-500 italic">${u.wallet?.balance.toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-500 italic">Locked: ${u.wallet?.lockedBalance.toFixed(2)}</p>
                    </td>
                    <td className="px-8 py-6">
                      {u.merchant ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-zinc-800 ${u.merchant.status === 'APPROVED' ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {u.merchant.status}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">NONE</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                         onClick={() => handleToggleFreeze(u.id, u.isFrozen)}
                         className={`text-[10px] font-black px-3 py-1 rounded border transition-all ${
                           u.isFrozen ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                         } uppercase italic`}
                       >
                         {u.isFrozen ? 'Unfreeze' : 'Freeze'}
                       </button>
                    </td>
                  </tr>
               ))}
             </tbody>
          </table>
        ) : activeTab === 'merchants' ? (
          <table className="w-full text-left">
             <thead>
               <tr className="border-b border-zinc-900 bg-zinc-900/5">
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Business Name</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Owner</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Payment Info</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Status</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {Array.isArray(merchants) && merchants.map(m => (
                  <tr key={m.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-white italic">{m.businessName}</p>
                      <p className="text-[10px] text-zinc-500 font-mono italic">{m.bio}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-white uppercase italic">{m.user?.name}</p>
                      <p className="text-[10px] text-zinc-500">{m.user?.email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-mono text-zinc-400">{m.phoneNumber}</p>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-zinc-800 ${
                         m.status === 'APPROVED' ? 'text-emerald-500' : 
                         m.status === 'PENDING' ? 'text-orange-500' : 
                         m.status === 'SUSPENDED' ? 'text-rose-500 ring-1 ring-rose-500/50' : 'text-zinc-500'
                       }`}>
                          {m.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 text-xs">
                          {m.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleApproveMerchant(m.id, 'APPROVED')}
                                className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-black uppercase italic"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleApproveMerchant(m.id, 'REJECTED')}
                                className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-lg border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all font-black uppercase italic"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {m.status === 'APPROVED' && (
                             <button 
                               onClick={() => handleApproveMerchant(m.id, 'SUSPENDED')}
                               className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-lg border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all font-black uppercase italic"
                             >
                               Suspend
                             </button>
                          )}
                          {m.status === 'SUSPENDED' && (
                             <button 
                               onClick={() => handleApproveMerchant(m.id, 'APPROVED')}
                               className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-black uppercase italic"
                             >
                               Unsuspend
                             </button>
                          )}
                       </div>
                    </td>
                  </tr>
               ))}
               {merchants.length === 0 && (
                 <tr><td colSpan={5} className="py-20 text-center text-zinc-600 font-bold italic">No merchants found.</td></tr>
               )}
             </tbody>
          </table>
        ) : activeTab === 'ads' ? (
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/5">
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Merchant</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Type / Price</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Liquidity</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(ads) && ads.map(ad => (
                   <tr key={ad.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors">
                     <td className="px-8 py-6">
                        <p className="text-sm font-bold text-white italic">{ad.merchant.user.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{ad.merchant.user.email}</p>
                     </td>
                     <td className="px-8 py-6">
                        <span className={`text-[10px] font-black italic uppercase px-2 py-0.5 rounded ${ad.type === 'SELL' ? 'text-orange-500 bg-orange-500/5' : 'text-emerald-500 bg-emerald-500/5'}`}>
                           {ad.type} @ {ad.price.toFixed(2)} ETB
                        </span>
                     </td>
                     <td className="px-8 py-6">
                        <p className="text-xs font-black text-white italic">{ad.remainingAmount.toFixed(2)} / {ad.amount.toFixed(2)} USDT</p>
                     </td>
                     <td className="px-8 py-6">
                        <span className={`text-[10px] font-black tracking-widest ${ad.status === 'ACTIVE' ? 'text-emerald-500' : 'text-zinc-500 italic'}`}>{ad.status}</span>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <span className="text-[10px] text-zinc-600 font-mono italic">{ad.id}</span>
                     </td>
                   </tr>
                ))}
              </tbody>
           </table>
        ) : activeTab === 'orders' ? (
          <table className="w-full text-left">
             <thead>
               <tr className="border-b border-zinc-900 bg-zinc-900/5">
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Parties</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Trade Value</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Dispute Info</th>
                 <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {Array.isArray(orders) && orders.map(o => (
                  <tr key={o.id} className={`border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors ${o.status === 'DISPUTED' ? 'bg-orange-500/5' : ''}`}>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-[8px] text-zinc-600 font-black uppercase italic">Buyer</p>
                        <p className="text-[10px] text-white font-bold italic">{o.type === 'SELL' ? o.creator.name : o.merchant.user.name}</p>
                        <p className="text-[8px] text-zinc-600 font-black uppercase italic mt-2">Seller</p>
                        <p className="text-[10px] text-white font-bold italic">{o.type === 'SELL' ? o.merchant.user.name : o.creator.name}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-black text-white italic">{o.amountUsdt.toFixed(2)} USDT</p>
                       <p className="text-[10px] text-zinc-500 italic">{o.amountEtb.toFixed(2)} ETB</p>
                       <span className={`text-[10px] font-black tracking-widest mt-2 block ${o.status === 'COMPLETED' ? 'text-emerald-500' : o.status === 'CANCELLED' ? 'text-rose-500' : 'text-orange-500'}`}>{o.status}</span>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                       {o.status === 'DISPUTED' && (
                         <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
                            <p className="text-[8px] text-orange-500 font-black uppercase italic mb-1">Dispute Reason</p>
                            <p className="text-[10px] text-zinc-400 italic line-clamp-3">{o.disputeReason}</p>
                         </div>
                       )}
                       {o.paymentProof && (
                         <button 
                           onClick={() => setSelectedImage(o.paymentProof!)}
                           className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-[8px] font-black uppercase tracking-tight italic mt-2"
                         >
                           <Eye className="w-3 h-3" /> External Proof
                         </button>
                       )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       {(o.status === 'DISPUTED' || o.status === 'PAID') && (
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => handleResolveOrder(o.id, 'RELEASE')}
                               className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-lg text-xs uppercase italic tracking-tight transition-all active:scale-95"
                             >
                               Release Funds
                             </button>
                             <button 
                               onClick={() => handleResolveOrder(o.id, 'CANCEL')}
                               className="bg-zinc-800 hover:bg-rose-600 text-white font-black px-3 py-1.5 rounded-lg text-xs uppercase italic tracking-tight transition-all active:scale-95"
                             >
                               Cancel Order
                             </button>
                          </div>
                       )}
                    </td>
                  </tr>
               ))}
             </tbody>
          </table>
        ) : activeTab === 'logs' ? (
          <table className="w-full text-left">
             <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/5">
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Time</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">User</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Action</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Details</th>
                </tr>
             </thead>
             <tbody>
                {Array.isArray(logs) && logs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors">
                    <td className="px-8 py-4 text-[10px] text-zinc-500 font-mono">
                      {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-xs font-bold text-white italic">{log.user?.email || 'SYSTEM'}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-xs font-black text-orange-500 bg-orange-500/5 px-2 py-1 rounded italic uppercase">{log.action}</span>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-[10px] text-zinc-600 font-mono truncate max-w-xs">{log.details || '-'}</p>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/5">
                <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">User / Date</th>
                {activeTab === 'deposits' ? (
                  <>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Amount (USDT)</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Transaction Hash</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Proof</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Amount (USDT)</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Destination / Network</th>
                  </>
                )}
                <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'deposits' ? (
                deposits.length > 0 ? deposits.map(dep => (
                  <tr key={dep.id} className={`border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors ${dep.status !== 'pending' ? 'opacity-50' : ''}`}>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-white tracking-tight italic truncate max-w-[200px]">{dep.user.name || dep.user.email}</p>
                      <p className="text-[10px] text-zinc-600 font-mono">{format(new Date(dep.createdAt), 'MMM dd, HH:mm')}</p>
                    </td>
                    <td className="px-8 py-6 ring-inset">
                      <span className="text-md font-black text-emerald-500 italic">${dep.amount}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 max-w-[150px]">
                        <p className="text-[10px] text-zinc-400 font-mono truncate">{dep.txHash}</p>
                        <a href={`https://tronscan.org/#/transaction/${dep.txHash}`} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-orange-500 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {dep.proofImageUrl && (
                        <button 
                          onClick={() => setSelectedImage(dep.proofImageUrl)}
                          className="flex items-center gap-1.5 text-orange-500 hover:text-orange-400 transition-colors text-xs font-bold uppercase tracking-tight italic"
                        >
                          <Eye className="w-4 h-4" /> View Proof
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {dep.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleVerifyDeposit(dep.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" title="Verify">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRejectDeposit(dep.id)} className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${dep.status === 'verified' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'}`}>
                          {dep.status}
                        </span>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan={5} className="py-20 text-center text-zinc-600 font-bold italic italic">No deposit requests.</td></tr>
              ) : (
                  withdrawals.length > 0 ? withdrawals.map(withd => (
                  <tr key={withd.id} className={`border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors ${withd.status !== 'pending' ? 'opacity-50' : ''}`}>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-white tracking-tight italic truncate max-w-[200px]">{withd.user.name || withd.user.email}</p>
                      <p className="text-[10px] text-zinc-600 font-mono">{format(new Date(withd.createdAt), 'MMM dd, HH:mm')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-md font-black text-orange-500 italic">{withd.amount} USDT</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-zinc-400 max-w-[200px] truncate italic font-medium" title={withd.walletAddress}>
                        {withd.walletAddress}
                      </p>
                      <span className="text-[9px] font-black text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 uppercase italic">
                        {withd.network}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {withd.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handlePayWithdrawal(withd.id)} className="p-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg transition-all flex items-center gap-2 px-3" title="Mark as Paid">
                            <CreditCard className="w-4 h-4" /> <span className="text-xs font-bold uppercase italic">Pay</span>
                          </button>
                          <button onClick={() => handleRejectWithdrawal(withd.id)} className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${withd.status === 'paid' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'}`}>
                          {withd.status}
                        </span>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan={4} className="py-20 text-center text-zinc-600 font-bold italic italic">No withdrawal requests.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Proof Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8">
           <button onClick={() => setSelectedImage(null)} className="absolute top-8 right-8 text-white hover:text-orange-500 hover:rotate-90 transition-all p-2 bg-zinc-900 rounded-full">
              <X className="w-8 h-8" />
           </button>
           <div className="max-w-4xl max-h-[80vh] overflow-auto rounded-2xl shadow-2xl border border-zinc-800">
             <img 
               src={selectedImage.startsWith('http') || selectedImage.startsWith('data:') ? selectedImage : `${axios.defaults.baseURL || ''}${selectedImage}`} 
               alt="Payment Proof" 
               className="w-full h-auto object-contain" 
             />
           </div>
           <p className="mt-8 text-zinc-500 italic font-medium">Verify transaction hash on TronScan before approval.</p>
        </div>
      )}
    </div>
  );
};
