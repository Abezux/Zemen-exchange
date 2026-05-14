import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore.ts';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Wallet as WalletIcon, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  createdAt: string;
}

export const Dashboard = () => {
  const { user, checkAuth } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/transactions/transactions');
        setTransactions(res.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <AlertCircle className="w-4 h-4 text-zinc-500" />;
    }
  };

  if (isLoading) return <div className="animate-pulse flex h-64 bg-zinc-900 rounded-3xl"></div>;

  const etbEquivalent = (user?.wallet?.balance || 0) * (user?.settings?.sellRate || 0);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Rate Notification */}
      {user?.settings && (
        <div className="flex gap-2 sm:gap-4">
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 p-2 sm:p-4 rounded-2xl flex items-center gap-2 sm:gap-4">
             <div className="bg-emerald-500/10 p-1.5 sm:p-2 rounded-lg text-emerald-500 text-[9px] sm:text-xs font-bold uppercase italic whitespace-nowrap">Buy Rate</div>
             <div className="text-white font-black italic text-sm sm:text-base">{user.settings.buyRate} ETB</div>
          </div>
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 p-2 sm:p-4 rounded-2xl flex items-center gap-2 sm:gap-4">
             <div className="bg-orange-500/10 p-1.5 sm:p-2 rounded-lg text-orange-500 text-[9px] sm:text-xs font-bold uppercase italic whitespace-nowrap">Sell Rate</div>
             <div className="text-white font-black italic text-sm sm:text-base">{user.settings.sellRate} ETB</div>
          </div>
        </div>
      )}

      {/* Balance Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-3 sm:p-6 md:p-8 rounded-[2rem] relative overflow-hidden group shadow-xl"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6 md:mb-8">
              <div className="space-y-2 sm:space-y-4">
                <div>
                  <p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Available Balance</p>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white italic tracking-tighter leading-none">
                    ${user?.wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                {user?.wallet?.lockedBalance ? (
                  <div className="bg-orange-500/5 border border-orange-500/20 p-2 sm:p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase italic tracking-widest">In Escrow / Locked</span>
                    <span className="text-white font-black italic tracking-tight text-sm">${user.wallet.lockedBalance.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
             <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-2xl shrink-0">
               <TrendingUp className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-500" />
             </div>
          </div>
          <div className="flex gap-2 sm:gap-4">
             <button 
               onClick={() => window.location.href = '/deposit'}
               className="flex-1 bg-white text-black font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all uppercase tracking-tight italic"
             >
               <ArrowDownLeft className="w-3 sm:w-4 h-3 sm:h-4" /> Deposit
             </button>
             <button 
               onClick={() => window.location.href = '/p2p'}
               className="flex-1 bg-zinc-800 text-white font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all uppercase tracking-tight italic border border-zinc-700"
             >
               <Users className="w-3 sm:w-4 h-3 sm:h-4" /> P2P
             </button>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black italic">USDT</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-900 border border-zinc-800 p-3 sm:p-6 md:p-8 rounded-[2rem] relative overflow-hidden group shadow-xl"
        >
          <div className="flex justify-between items-start mb-3 sm:mb-6 md:mb-8">
             <div>
               <p className="text-zinc-500 text-[9px] sm:text-xs font-bold uppercase tracking-widest mb-1">Estimated Value</p>
               <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white italic tracking-tighter">
                 {etbEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm sm:text-lg md:text-xl">ETB</span>
               </h3>
               <p className="text-zinc-400 text-[9px] sm:text-xs mt-1 font-mono">Based on current sell rate</p>
             </div>
             <div className="bg-orange-500/10 p-2 sm:p-3 rounded-2xl shrink-0">
               <WalletIcon className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500" />
             </div>
          </div>
          <div className="flex gap-2 sm:gap-4">
             <button 
               onClick={() => window.location.href = '/withdraw'}
               className="flex-1 bg-orange-600 text-white font-bold py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition-all uppercase tracking-tight italic"
             >
               <ArrowUpRight className="w-3 sm:w-4 h-3 sm:h-4" /> Withdraw
             </button>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black italic">ETB</div>
        </motion.div>
      </div>

      {/* Transactions Section */}
      <div className="bg-zinc-950 rounded-[2rem] border border-zinc-900 overflow-hidden shadow-2xl">
        <div className="p-3 sm:p-4 md:p-8 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/10">
          <div className="flex items-center gap-2 sm:gap-3">
             <History className="w-5 sm:w-6 h-5 sm:h-6 text-zinc-500 shrink-0" />
             <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight italic uppercase">Recent Activity</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/5">
                <th className="px-2 sm:px-4 md:px-8 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Date</th>
                <th className="px-2 sm:px-4 md:px-8 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Type</th>
                <th className="px-2 sm:px-4 md:px-8 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Amount</th>
                <th className="hidden md:table-cell px-2 sm:px-4 md:px-8 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Asset</th>
                <th className="px-2 sm:px-4 md:px-8 py-2 sm:py-4 text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/50 transition-colors cursor-default">
                    <td className="px-2 sm:px-4 md:px-8 py-2 sm:py-4">
                      <p className="text-xs sm:text-sm font-medium text-white">{format(new Date(tx.createdAt), 'MMM dd')}</p>
                      <p className="text-[8px] sm:text-[10px] text-zinc-600 font-mono tracking-tighter">{tx.id.substring(0, 6)}</p>
                    </td>
                    <td className="px-2 sm:px-4 md:px-8 py-2 sm:py-4">
                      <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-tight flex items-center gap-1 ${tx.type === 'deposit' ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {tx.type === 'deposit' ? <ArrowDownLeft className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <ArrowUpRight className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                        <span className="hidden sm:inline">{tx.type}</span>
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-8 py-2 sm:py-4">
                       <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                         {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()}
                       </span>
                    </td>
                    <td className="hidden md:table-cell px-2 sm:px-4 md:px-8 py-2 sm:py-4">
                      <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        {tx.currency}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-8 py-2 sm:py-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {getStatusIcon(tx.status)}
                        <span className="text-[9px] sm:text-xs font-bold text-white capitalize">{tx.status.substring(0, 4)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 sm:px-4 md:px-8 py-8 sm:py-12 md:py-16 text-center text-zinc-600 italic">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
